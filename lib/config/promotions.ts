// Win Room v2.0 - Promotion Banner Configuration
// ==============================================
//
// 📝 NASIL KULLANILIR:
//
// 1. Aşağıdaki "currentPromotion" objesini düzenle
// 2. Değişiklikleri kaydet
// 3. Sayfa otomatik refresh olur, banner güncellenir
//
// 💡 İPUCU: Alttaki örneklerden kopyala-yapıştır yapabilirsin!
//
// ==============================================

export interface PromotionConfig {
  title: string;      // Başlık (uppercase görünür)
  message: string;    // Mesaj metni
  variant: 'promo' | 'info' | 'success' | 'warning';  // Renk teması
  icon: string;       // Emoji (🎯, 🔥, ✨, 🏆, ⚠️, 💰, 🎉, vb.)
  visible: boolean;   // true = göster, false = gizle
}

// ============================================
// BURADAN PROMOTION'I DEĞİŞTİRİN
// ============================================

export const currentPromotion: PromotionConfig = {
  title: 'Black Friday Başladı! 🔥',
  message: 'Şov zamanı! Bugün özel indirimler var, hızlı karar alıp müşterilerinizi kazanın. En çok satan kazanır!',
  variant: 'promo',
  icon: '🎯',
  visible: true,
};

// ============================================
// VARIANT ÖRNEKLERİ (Renk Temaları)
// ============================================
//
// 'promo'    → Mor/pembe gradient (Kampanyalar, özel günler)
// 'success'  → Yeşil gradient (Başarılar, hedef yaklaşımları)
// 'info'     → Mavi gradient (Bilgilendirmeler, yeni özellikler)
// 'warning'  → Turuncu/sarı gradient (Dikkat çeken duyurular)

// ============================================
// ÖRNEK PROMOTION'LAR (Kopyala-yapıştır)
// ============================================

/*
// Black Friday
{
  title: 'Black Friday Başladı! 🔥',
  message: 'Şov zamanı! Bugün özel indirimler var, hızlı karar alıp müşterilerinizi kazanın.',
  variant: 'promo',
  icon: '🎯',
  visible: true,
}

// Yılbaşı Kampanyası
{
  title: 'Yılbaşı Kampanyası 🎄',
  message: 'Yeni yıla özel fırsatlar! Müşterilerinize harika teklifler sunun.',
  variant: 'promo',
  icon: '🎅',
  visible: true,
}

// Hedef Yaklaşıyor
{
  title: 'Hedef Yaklaşıyor! 🏆',
  message: 'Takım hedefine sadece $5K kaldı! Son bir push yapalım!',
  variant: 'success',
  icon: '🚀',
  visible: true,
}

// Yeni Özellik Duyurusu
{
  title: 'Yeni Özellik ✨',
  message: 'Taksit sistemi aktif! Artık taksitli satışları kolayca takip edebilirsiniz.',
  variant: 'info',
  icon: '🆕',
  visible: true,
}

// Sistem Bakımı
{
  title: 'Dikkat! Sistem Bakımı ⚠️',
  message: 'Bugün saat 18:00\'de kısa süreli bakım olacak. Lütfen işlemlerinizi tamamlayın.',
  variant: 'warning',
  icon: '🔧',
  visible: true,
}

// Motivasyon
{
  title: 'Harika Gidiyorsunuz! 💪',
  message: 'Bu hafta rekor kırıyoruz! Devam edin, en iyi performansınızı gösterin.',
  variant: 'success',
  icon: '⭐',
  visible: true,
}

// Hafta Sonu Özel
{
  title: 'Hafta Sonu Özel 🎉',
  message: 'Cumartesi-Pazar ekstra bonuslar var! Hafta sonu satışlarını kaçırmayın.',
  variant: 'promo',
  icon: '💰',
  visible: true,
}

// Banner'ı Gizle
{
  title: '',
  message: '',
  variant: 'info',
  icon: '',
  visible: false,  // ← Bu satırı true/false yaparak banner'ı göster/gizle
}
*/
