# Digital Ocean Deployment Guide

## Build Hatası Çözümleri

### `<Html>` Import Hatası

Eğer Digital Ocean'da build sırasında şu hatayı alıyorsanız:
```
Error: <Html> should not be imported outside of pages/_document.
```

**Çözüm 1: App Spec'i Kontrol Edin**
Digital Ocean App Platform'da App Spec'inizi kontrol edin:
- Build Command: `npm run build` (NOT `npm run export`)
- Run Command: `npm start`

**Çözüm 2: Build Cache'i Temizleyin**
Digital Ocean dashboard'da:
1. Settings > App-Level Build Phase
2. "Clear build cache" butonuna tıklayın
3. Yeniden deploy edin

**Çözüm 3: Environment Variables**
Şu environment variable'ı ekleyin:
```
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
```

## Deployment Adımları

1. **GitHub'a Push**
   ```bash
   git add .
   git commit -m "Deploy: Win Room v2.0"
   git push origin main
   ```

2. **Digital Ocean App Platform**
   - Otomatik deploy başlayacak
   - Build loglarını kontrol edin
   - Health check: `/api/health`

3. **Environment Variables Ayarlayın**
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secret-key
   NODE_ENV=production
   ```

## Sorun Giderme

### Build Başarılı Ama Çalışmıyor
- Environment variables'ları kontrol edin
- Database connection'ı test edin
- Health check endpoint'ini test edin: `/api/health`

### Hydration Errors
- Bu hatalar düzeltildi
- Eğer devam ederse, browser cache'ini temizleyin

### Database Connection Errors
- DATABASE_URL'in doğru olduğundan emin olun
- Database'in Digital Ocean network'ünde erişilebilir olduğunu kontrol edin
