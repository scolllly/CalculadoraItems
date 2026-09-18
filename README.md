# Limpiapipas — Guía de despliegue

La aplicación es una SPA estática servida con nginx en AWS ECS (Fargate). El despliegue involucra dos repositorios y dos flujos diferenciados: uno para provisionar la infraestructura y otro para construir y publicar la imagen de la aplicación.

---

## Repositorios

| Repositorio | Rol |
|---|---|
| `limpipipas` | Código de la app + workflow de build/deploy de imagen |
| `limpiapipas-terraform` | Infraestructura AWS (VPC, ECS, ECR, ALB, API Gateway) |

---

## Requisitos previos

- Cuenta AWS con permisos para crear los recursos definidos en terraform (VPC, ECS, ECR, ALB, API Gateway, IAM, S3, DynamoDB)
- Usuario o rol IAM con access key programática
- Ambos repositorios subidos a GitHub

---

## Paso 1 — Configurar secretos y variables en GitHub (manual)

Esto se hace **una sola vez** en cada repositorio desde **Settings → Secrets and variables → Actions**.

### En `limpiapipas-terraform`

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `AWS_ACCESS_KEY_ID` | Access key del usuario IAM |
| Secret | `AWS_SECRET_ACCESS_KEY` | Secret key del usuario IAM |
| Secret | `AWS_REGION` | Región donde desplegar, ej. `us-east-1` |
| Variable | `PROJECT_NAME` | Nombre del proyecto, ej. `limpiapipas-demo` *(opcional, ese es el default)* |

### En `limpipipas`

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `AWS_ACCESS_KEY_ID` | Mismo access key IAM |
| Secret | `AWS_SECRET_ACCESS_KEY` | Mismo secret key IAM |
| Secret | `AWS_REGION` | Misma región |
| Variable | `PROJECT_NAME` | El mismo valor que en el repo de terraform *(opcional)* |

> Los nombres de cluster, servicio y repositorio ECR se derivan de `PROJECT_NAME` con el patrón `<PROJECT_NAME>-cluster`, `<PROJECT_NAME>-service`, `<PROJECT_NAME>-repo`.

### Permisos IAM requeridos para el workflow de `limpipipas`

El usuario o rol IAM usado en este repositorio solo necesita permisos para interactuar con ECR y ECS. La política mínima es:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRAuth",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "ECRPush",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": "arn:aws:ecr:<region>:<account-id>:repository/<PROJECT_NAME>-repo"
    },
    {
      "Sid": "ECSDescribe",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECSDeployment",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:RegisterTaskDefinition"
      ],
      "Resource": [
        "arn:aws:ecs:<region>:<account-id>:service/<PROJECT_NAME>-cluster/<PROJECT_NAME>-service",
        "arn:aws:ecs:<region>:<account-id>:task-definition/<PROJECT_NAME>-task:*"
      ]
    },
    {
      "Sid": "IAMPassRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::<account-id>:role/<PROJECT_NAME>-task-execution-role",
        "arn:aws:iam::<account-id>:role/<PROJECT_NAME>-task-role"
      ],
      "Condition": {
        "StringLike": {
          "iam:PassedToService": "ecs-tasks.amazonaws.com"
        }
      }
    }
  ]
}
```

Reemplazar `<region>`, `<account-id>` y `<PROJECT_NAME>` con los valores reales.

- `ecr:GetAuthorizationToken`, `ecs:DescribeServices` y `ecs:DescribeTaskDefinition` necesitan `Resource: *` porque operan a nivel de cuenta o no aceptan ARN de recurso específico.
- `iam:PassRole` es necesario para registrar una nueva revisión de la task definition: ECS requiere que el usuario pueda "pasar" los roles de ejecución y tarea al servicio `ecs-tasks.amazonaws.com`. Los nombres de los roles deben coincidir con los definidos en `iam.tf` del repositorio de terraform.

---

## Paso 2 — Provisionar la infraestructura (manual, primera vez)

La infraestructura se gestiona desde el repositorio `limpiapipas-terraform`.

1. Ir a **Actions → Deploy Terraform to AWS**
2. Hacer clic en **Run workflow** sobre la rama `main`

El workflow hace automáticamente:
- Crea el bucket S3 y la tabla DynamoDB para el estado remoto de Terraform (bootstrap idempotente)
- Aprovisiona VPC, subnets, security groups, ECR, ECS cluster, ECS service, ALB y API Gateway
- Al finalizar, el resumen del job muestra la URL de acceso (API Gateway) y el DNS del ALB

> Este paso también se ejecuta automáticamente en cada push a `main` de ese repositorio, por lo que cualquier cambio de infraestructura posterior es automático.

### Outputs relevantes tras el apply

Una vez completado, el job imprime:

```
API Gateway URL  → https://<id>.execute-api.<region>.amazonaws.com/
ALB DNS Name     → http://<alb-name>.<region>.elb.amazonaws.com
ECR Repository   → <account>.dkr.ecr.<region>.amazonaws.com/<project>-repo
```

---

## Paso 3 — Primer despliegue de la imagen (manual o automático)

La primera vez que se crea la infraestructura, el servicio ECS arranca con la imagen placeholder `httpd:alpine` definida en `variables.tf`. Para reemplazarla con la imagen real de la app:

1. Hacer un push a `main` en el repositorio `limpipipas` (o ejecutar el workflow manualmente desde **Actions → Build & Deploy to ECS → Run workflow**)

El workflow se divide en dos jobs que corren en secuencia:

**Job CI:**
1. Instala dependencias con `npm ci`
2. Corre los tests de vitest (`npm test`) — ver nota sobre `skip_tests` más abajo
3. Construye la imagen Docker localmente para validar que el `Dockerfile` no tiene errores

**Job CD** (solo arranca si CI pasó):
1. Login en Amazon ECR
2. Build y push de la imagen con dos tags: `<git-sha>` y `latest`
3. `aws ecs update-service --force-new-deployment` sobre el cluster y servicio correspondientes
4. Espera a que el servicio estabilice (`ecs wait services-stable`)

Al finalizar, la aplicación estará accesible en la URL de API Gateway obtenida en el paso anterior.

### Omitir los tests puntualmente

Al disparar el workflow de forma manual (**Run workflow**) aparece el input `skip_tests`. Ponerlo en `true` hace que el step de vitest se salte, pero CI sigue corriendo (instalación de dependencias y build de imagen). El CD solo corre si CI pasa.

---

## Flujo de trabajo cotidiano (todo automático)

```
Cambio en el código
       │
       ▼
  git push → main (limpipipas)
       │
       ▼
  ┌─── Job CI ───────────────────────┐
  │  npm ci                          │
  │  npm test (vitest) ← condicional │
  │  docker build (validación local) │
  └──────────────────────────────────┘
       │ CI pasa
       ▼
  ┌─── Job CD ───────────────────────┐
  │  docker build + push a ECR       │
  │  ECS force-new-deployment        │
  │  ecs wait services-stable        │
  └──────────────────────────────────┘
       │
       ▼
  Nueva versión en producción
```

Si los tests fallan, el job CD no se ejecuta y el deploy no ocurre.

Para cambios de infraestructura el flujo es idéntico pero sobre `limpiapipas-terraform`.

---

## Teardown — Destruir la infraestructura (manual)

Ambos workflows se ejecutan solo con `workflow_dispatch` y requieren confirmación escrita para prevenir destrucciones accidentales.

### 1. Destruir el stack principal (ECS, ECR, ALB, VPC, etc.)

En `limpiapipas-terraform` → **Actions → Destroy AWS Infrastructure → Run workflow**

Ingresar `destroy` en el campo de confirmación. El bucket de state y la tabla DynamoDB se conservan para poder re-desplegar después.

### 2. Destruir el bootstrap (bucket S3 + DynamoDB)

Solo si se quiere eliminar todo sin posibilidad de recuperar el estado:

En `limpiapipas-terraform` → **Actions → Destroy Bootstrap (State Backend) → Run workflow**

Ingresar `destroy-bootstrap` en el campo de confirmación.

> Destruir el bootstrap antes que el stack principal dejará el state huérfano. Siempre ejecutar en el orden indicado.

---

## Resumen: qué es manual y qué es automático

| Paso | Manual | Automático |
|---|---|---|
| Configurar secretos/variables en GitHub | ✓ | |
| Primer provisioning de infraestructura | ✓ *(o push a main en terraform)* | |
| Re-provisioning por cambios de infra | | ✓ push a main en terraform |
| Build y deploy de la app | | ✓ push a main en limpipipas (CI → CD) |
| Omitir tests en deploy manual | ✓ input `skip_tests: true` | |
| Destruir infraestructura | ✓ workflow_dispatch + confirmación | |
