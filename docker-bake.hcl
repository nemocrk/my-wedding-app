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

# NOTA SU CACHE SCOPES:
# Usiamo 'scope=build-<service>' per allinearci con la release-pipeline.yml
# In questo modo, quando la pipeline di test gira su 'main', popola la cache 
# che verrà poi riutilizzata dalla release pipeline.

target "backend" {
  context = "./backend"
  dockerfile = "Dockerfile"
  target = BUILD_TARGET
  tags = ["my-wedding-app-backend:latest"]
  cache-from = ["type=gha,scope=build-backend"]
  cache-to   = ["type=gha,mode=max,scope=build-backend"]
}

target "backend-worker" {
  context = "./backend"
  dockerfile = "Dockerfile"
  target = BUILD_TARGET
  tags = ["my-wedding-app-backend-worker:latest"]
  # Il worker condivide il contesto del backend, quindi usiamo la stessa cache del backend
  cache-from = ["type=gha,scope=build-backend"]
  cache-to   = ["type=gha,mode=max,scope=build-backend"]
}

target "frontend-user" {
  context = "./frontend-user"
  dockerfile = "Dockerfile"
  target = BUILD_TARGET
  args = {
    REACT_APP_API_URL = REACT_APP_API_URL
  }
  tags = ["my-wedding-app-frontend-user:latest"]
  cache-from = ["type=gha,scope=build-frontend-user"]
  cache-to   = ["type=gha,mode=max,scope=build-frontend-user"]
}

target "frontend-admin" {
  context = "./frontend-admin"
  dockerfile = "Dockerfile"
  target = BUILD_TARGET
  args = {
    REACT_APP_API_URL = REACT_APP_ADMIN_API_URL
  }
  tags = ["my-wedding-app-frontend-admin:latest"]
  cache-from = ["type=gha,scope=build-frontend-admin"]
  cache-to   = ["type=gha,mode=max,scope=build-frontend-admin"]
}

target "whatsapp-integration" {
  context = "./whatsapp-integration"
  dockerfile = "Dockerfile"
  target = BUILD_TARGET
  tags = ["my-wedding-app-whatsapp-integration:latest"]
  cache-from = ["type=gha,scope=build-whatsapp-integration"]
  cache-to   = ["type=gha,mode=max,scope=build-whatsapp-integration"]
}

target "nginx-public" {
  context = "."
  dockerfile = "./nginx/Dockerfile"
  target = "public"
  tags = ["my-wedding-app-nginx-public:latest"]
  cache-from = ["type=gha,scope=build-nginx-public"]
  cache-to   = ["type=gha,mode=max,scope=build-nginx-public"]
}

target "nginx-intranet" {
  context = "."
  dockerfile = "./nginx/Dockerfile"
  target = "intranet"
  tags = ["my-wedding-app-nginx-intranet:latest"]
  cache-from = ["type=gha,scope=build-nginx-intranet"]
  cache-to   = ["type=gha,mode=max,scope=build-nginx-intranet"]
}
