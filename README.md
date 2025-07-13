
# Serverless Portal Demo · Ingeniería UPC 🛰️

Demo académico que ilustra un _End-to-End_ **portal de eventos** para capítulos estudiantiles (IEEE, ACM, RAS, CIS, …).  
Todo el stack está construido **100 % serverless** sobre AWS con IaC en CDK v2 (TypeScript).

| Capa | Servicio | Notas clave |
|------|----------|-------------|
| Infra as Code | **AWS CDK v2** | Single-stack (`InfraStack`) |
| CDN + hosting | **Amazon CloudFront** + **S3 (OAC)** | Sitio estático (Astro) |
| API | **API Gateway – HTTP API** | CORS abierto, ruta `/events` |
| Función | **AWS Lambda (Node 18)** | Bundling con _esbuild_ |
| Datos | **Amazon DynamoDB (on-demand)** | Tabla `Events` |
| Frontend | **Astro 5 + adapter-static** | `index.astro` ↔ API |

---

## 0. Requisitos previos

| Software | Versión&nbsp;mínima | Verificación |
|----------|--------------------|--------------|
| Node.js  | 18.x | `node -v` ⇒ `v18.*` |
| npm      | 9.x  | `npm -v`  ⇒ `9.*` |
| AWS CLI v2 | 2.11+ | `aws --version` |
| CDK CLI v2 | 2.1100+ | `cdk --version` |

---

## 1. Clonado y estructura

```bash
git clone https://github.com/ClaudiaSifuentes/Serverless-Portal-Demo-Ingenier-a-UPC
cd Serverless-Portal-Demo-Ingenier-a-UPC
````

```
.
├─ backend/
│  └─ createEvent/index.ts
├─ infra/
│  ├─ bin/infra.ts
│  └─ lib/infra-stack.ts
└─ frontend/
   └─ src/pages/index.astro
```

---

## 2. Despliegue de infraestructura

```bash
cd infra
npm ci
npm run build
cdk bootstrap          # 1ª vez en la cuenta
cdk deploy             # ~4 min
```

Guarda los **Outputs**:

* `SiteURL` — [https://dxxxx.cloudfront.net](https://dxxxx.cloudfront.net)
* `ApiURL`  — [https://xxxxxxxxxx.execute-api](https://xxxxxxxxxx.execute-api).<region>.amazonaws.com

---

## 3. Frontend (Astro)

```bash
cd ../frontend
echo "PUBLIC_API_URL=<pega_ApiURL>" > .env

npm ci
npm run build          # crea dist/

BUCKET=$(aws cloudformation list-exports \
  --query "Exports[?Name=='SiteBucket'].Value" --output text)
DISTID=$(aws cloudformation list-exports \
  --query "Exports[?Name=='DistributionId'].Value" --output text)

aws s3 sync dist/ "s3://$BUCKET" --delete \
  --acl bucket-owner-full-control
aws cloudfront create-invalidation --distribution-id "$DISTID" --paths '/*'
```

Abre **SiteURL** y prueba el formulario.

---

## 4. Test rápido por cURL

```bash
API=https://xxxxxxxxxx.execute-api.<region>.amazonaws.com
curl -X POST "$API/events" \
     -H "Content-Type: application/json" \
     -d '{"name":"Demo CLI","date":"2025-12-01"}'
```

Verifica en DynamoDB:

```bash
TABLE=$(aws cloudformation list-stack-resources \
  --stack-name InfraStack \
  --query "StackResources[?ResourceType=='AWS::DynamoDB::Table'].PhysicalResourceId" \
  --output text)

aws dynamodb scan --table-name "$TABLE" \
  --projection-expression 'PK, #n, #d' \
  --expression-attribute-names '{"#n":"name","#d":"date"}' \
  --output table
```

---

## 5. Costos estimados (Free Tier)

| Servicio   | Uso demo       | Free Tier  | Extra       |
| ---------- | -------------- | ---------- | ----------- |
| S3         | < 1 MB         | 5 GB       | 0.023 \$/GB |
| CloudFront | < 1 000 req    | 1 TB       | 0.085 \$/GB |
| DynamoDB   | 10 RCU/10 WCU  | 25 RCU/WCU | 0.25 \$/M   |
| Lambda     | < 1 000 invoc. | 1 M        | 0.20 \$/M   |
| API HTTP   | < 1 000 calls  | 1 M        | 1 \$/M      |

---

## 6. Limpieza

```bash
cd infra
cdk destroy
```

---

## 7. Desarrollo local

```bash
# Dev server del front
cd frontend
npm run dev             # http://localhost:4321

# Tests (si los añades)
cd infra
npm test
```



## Licencia

MIT © 2025 — Facultad de Ingeniería · Universidad Peruana de Ciencias



