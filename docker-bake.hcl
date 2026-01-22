# docker-bake.hcl
# Definisce i target di build per docker buildx bake
# Questo file viene usato dalla CI per buildare le immagini con caching ottimizzato

variable "BUILD_TARGET" {
  default = "production"
}

variable "REACT_APP_API_URL" {
  default = "http://localhost/api"
}

variable "REACT_APP_ADMIN_API_URL" {
  default = "http://localhost:8080/api"
}

group "default" {
  targets = ["backend", "backend-worker", "frontend-user", "frontend-admin", "whatsapp-integration", "nginx-public", "nginx-intranet"]
}

target "backend" {
  context = "./backend"
  dockerfile = "Dockerfile"
  target = BUILD_TARGET
  tags = ["my-wedding-app-backend:latest"]
}

target "backend-worker" {
  context = "./backend"
  dockerfile = "Dockerfile"
  target = BUILD_TARGET
  tags = ["my-wedding-app-backend-worker:latest"]
}

target "frontend-user" {
  context = "./frontend-user"
  dockerfile = "Dockerfile"
  target = BUILD_TARGET
  args = {
    REACT_APP_API_URL = REACT_APP_API_URL
  }
  tags = ["my-wedding-app-frontend-user:latest"]
}

target "frontend-admin" {
  context = "./frontend-admin"
  dockerfile = "Dockerfile"
  target = BUILD_TARGET
  args = {
    REACT_APP_API_URL = REACT_APP_ADMIN_API_URL
  }
  tags = ["my-wedding-app-frontend-admin:latest"]
}

target "whatsapp-integration" {
  context = "./whatsapp-integration"
  dockerfile = "Dockerfile"
  target = BUILD_TARGET
  tags = ["my-wedding-app-whatsapp-integration:latest"]
}

target "nginx-public" {
  context = "."
  dockerfile = "./nginx/Dockerfile"
  target = "public"
  tags = ["my-wedding-app-nginx-public:latest"]
}

target "nginx-intranet" {
  context = "."
  dockerfile = "./nginx/Dockerfile"
  target = "intranet"
  tags = ["my-wedding-app-nginx-intranet:latest"]
}
