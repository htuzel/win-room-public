# 📢 Promotion Banner Kullanım Kılavuzu

Promotion banner'ı `lib/config/promotions.ts` dosyasından kolayca değiştirebilirsiniz.

## 🚀 Hızlı Başlangıç

1. `lib/config/promotions.ts` dosyasını aç
2. `currentPromotion` objesini düzenle
3. Kaydet - sayfa otomatik refresh olur!

## 📝 Parametreler

| Parametre | Tür | Açıklama | Örnek |
|-----------|-----|----------|-------|
| `title` | string | Başlık (uppercase görünür) | `"Black Friday! 🔥"` |
| `message` | string | Mesaj metni | `"Şov zamanı! Hızlı karar alın."` |
| `variant` | select | Renk teması | `"promo"` / `"info"` / `"success"` / `"warning"` |
| `icon` | emoji | Emoji icon | `"🎯"` / `"🔥"` / `"✨"` / `"🏆"` |
| `visible` | boolean | Göster/gizle | `true` / `false` |

## 🎨 Renk Temaları (Variants)

### `promo` - Mor/Pembe
Kampanyalar, özel günler, promosyonlar için.
```ts
variant: 'promo'
```

### `success` - Yeşil
Başarılar, hedef yaklaşımları, pozitif haberler için.
```ts
variant: 'success'
```

### `info` - Mavi
Bilgilendirmeler, yeni özellikler, duyurular için.
```ts
variant: 'info'
```

### `warning` - Turuncu/Sarı
Dikkat çeken duyurular, bakım bildirimleri için.
```ts
variant: 'warning'
```

## 📚 Hazır Örnekler

### Black Friday
```ts
{
  title: 'Black Friday Başladı! 🔥',
  message: 'Şov zamanı! Bugün özel indirimler var.',
  variant: 'promo',
  icon: '🎯',
  visible: true,
}
```

### Hedef Yaklaşıyor
```ts
{
  title: 'Hedef Yaklaşıyor! 🏆',
  message: 'Takım hedefine sadece $5K kaldı!',
  variant: 'success',
  icon: '🚀',
  visible: true,
}
```

### Yeni Özellik
```ts
{
  title: 'Yeni Özellik ✨',
  message: 'Taksit sistemi aktif!',
  variant: 'info',
  icon: '🆕',
  visible: true,
}
```

### Sistem Bakımı
```ts
{
  title: 'Dikkat! ⚠️',
  message: 'Saat 18:00\'de bakım olacak.',
  variant: 'warning',
  icon: '🔧',
  visible: true,
}
```

## 🎯 Popüler Emoji'ler

Kampanya/Promo:
- 🔥 Ateş
- 🎯 Hedef
- 💰 Para
- 🎉 Kutlama
- 🎁 Hediye
- ⚡ Şimşek
- 🚀 Roket

Başarı/Hedef:
- 🏆 Kupa
- ⭐ Yıldız
- 💪 Güç
- 👑 Taç
- 🥇 Madalya

Bilgi/Duyuru:
- ✨ Parıltı
- 🆕 Yeni
- 📢 Megafon
- 💡 Ampul
- 📣 Duyuru

Uyarı/Dikkat:
- ⚠️ Uyarı
- 🔧 Bakım
- ⏰ Saat
- 🛠️ Araçlar

## 🎬 Banner'ı Gizleme

Banner'ı tamamen gizlemek için:
```ts
visible: false
```

## 💡 İpuçları

1. **Kısa ve öz mesajlar** kullanın - uzun metinler okunmuyor
2. **Emoji'yi başlıkta** da kullanabilirsiniz (örn: "Black Friday! 🔥")
3. **Variant'ı mesaja göre** seçin (kampanya = promo, başarı = success, vs.)
4. **Test edin** - farklı variant'ları deneyip en iyisini seçin

## 🔄 Değişiklik Örnekleri

### Örnek 1: Black Friday → Yılbaşı
```diff
- title: 'Black Friday Başladı! 🔥',
+ title: 'Yılbaşı Kampanyası 🎄',
- message: 'Şov zamanı! Bugün özel indirimler var.',
+ message: 'Yeni yıla özel fırsatlar!',
  variant: 'promo',
- icon: '🎯',
+ icon: '🎅',
  visible: true,
```

### Örnek 2: Banner'ı geçici gizle
```diff
  title: 'Black Friday Başladı! 🔥',
  message: 'Şov zamanı!',
  variant: 'promo',
  icon: '🎯',
- visible: true,
+ visible: false,
```

---

**Dosya Konumu:** `/lib/config/promotions.ts`
