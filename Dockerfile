FROM nginx:alpine

LABEL maintainer="Limpiapipas Team"
LABEL description="Aplicación web estática Limpiapipas desplegada en Nginx para AWS ECS"

# Argumento opcional para configurar la URL de la imagen de S3 en tiempo de construcción
ARG S3_IMAGE_URL=""

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos estáticos de la aplicación
COPY index.html /usr/share/nginx/html/index.html
COPY src /usr/share/nginx/html/src
COPY styles /usr/share/nginx/html/styles
COPY vendor /usr/share/nginx/html/vendor

# Si se proporciona S3_IMAGE_URL como build-arg, reemplazar el placeholder en index.html
RUN if [ -n "$S3_IMAGE_URL" ]; then \
      sed -i "s|https://TU-BUCKET-S3.s3.amazonaws.com/logo.png|${S3_IMAGE_URL}|g" /usr/share/nginx/html/index.html; \
    fi

# Exponer el puerto estándar HTTP
EXPOSE 80

# Chequeo de salud nativo de Docker compatible con ECS
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
