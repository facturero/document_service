# document-service — Deploy

## Stack

| Componente | Opción | Puerto |
|------------|--------|--------|
| Base de datos | MySQL 8+ | 3306 |
| Storage | Disco local (vía PVC en K3s) | — |
| Servicio | Node.js 20 + Hono | 3003 |

---

## 1. Desarrollo local

### 1.1 Base de datos

```bash
# Crear la base de datos (asume MySQL corriendo en localhost:3306)
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS document_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 1.2 Variables de entorno

El archivo `.env` ya tiene los valores por defecto para dev local. Verificá que coincidan con tu MySQL:

```env
NODE_ENV=development
PORT=3003
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=document_db

STORAGE_DRIVER=local
LOCAL_STORAGE_PATH=./uploads

CORS_ORIGIN=*
```

### 1.3 Instalar dependencias y migrar

```bash
cd backend/document-service
npm install
npm run db:migrate
```

### 1.4 Iniciar en modo desarrollo

```bash
npm run dev
```

Servicio disponible en `http://localhost:3003`.

### 1.5 Probar health check

```bash
curl http://localhost:3003/health
# → {"status":"ok"}
```

---

## 2. Deploy en K3s (local storage)

### 2.1 PersistentVolumeClaim

Crear el PVC para los archivos subidos y la carpeta de uploads:

```yaml
# k8s/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: document-storage-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

```bash
kubectl apply -f k8s/pvc.yaml
```

### 2.2 Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: document-service
  labels:
    app: document-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: document-service
  template:
    metadata:
      labels:
        app: document-service
    spec:
      containers:
        - name: document-service
          image: ghcr.io/tu-org/document-service:latest
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3003"
            - name: DB_HOST
              value: "mysql-service"
            - name: DB_PORT
              value: "3306"
            - name: DB_USER
              value: "root"
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: password
            - name: DB_NAME
              value: "document_db"
            - name: STORAGE_DRIVER
              value: "local"
            - name: LOCAL_STORAGE_PATH
              value: "/data/uploads"
            - name: CORS_ORIGIN
              value: "*"
          ports:
            - containerPort: 3003
          volumeMounts:
            - name: storage
              mountPath: /data/uploads
      volumes:
        - name: storage
          persistentVolumeClaim:
            claimName: document-storage-pvc
```

### 2.3 Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: document-service
spec:
  selector:
    app: document-service
  ports:
    - port: 3003
      targetPort: 3003
```

### 2.4 Aplicar todo

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

### 2.5 Migraciones en producción

```bash
kubectl exec deployment/document-service -- npm run db:migrate
```

---

## 3. Agregar ruta al API Gateway

En la configuración del gateway (`backend/api-gateway-node/src/config/gateway.config.ts`), agregar:

```typescript
{
  name: 'document-service',
  url: env.DOCUMENT_SERVICE_URL,  // http://document-service:3003
}
```

Y las rutas:

```typescript
{ method: 'POST',  path: '/documents/files/presigned', service: 'document-service', public: false },
{ method: 'GET',   path: '/documents/files',            service: 'document-service', public: false },
{ method: 'GET',   path: '/documents/files/*',          service: 'document-service', public: false },
{ method: 'PATCH', path: '/documents/files/*',          service: 'document-service', public: false },
{ method: 'DELETE',path: '/documents/files/*',          service: 'document-service', public: false },
```

---

## 4. Comandos útiles

```bash
# Ver logs
kubectl logs -f deployment/document-service

# Ver archivos subidos (dentro del pod)
kubectl exec deployment/document-service -- ls -la /data/uploads/

# Resetear base de datos (local)
npm run db:migrate:undo
npm run db:migrate

# Type check
npm run typecheck

# Tests
npm test
```
