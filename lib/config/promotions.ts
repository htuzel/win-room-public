// Win Room v2.0 - Promotion Banner Configuration
// ==============================================
//
// 📝 HOW TO USE:
//
// 1. Edit the "currentPromotion" object below.
// 2. Save your changes.
// 3. The page auto-refreshes and updates the banner.
//
// 💡 TIP: Copy-paste from the examples below!
//
// ==============================================

export interface PromotionConfig {
  title: string;      // Title (appears uppercase)
  message: string;    // Banner content
  variant: 'promo' | 'info' | 'success' | 'warning';  // Color theme
  icon: string;       // Emoji (🎯, 🔥, ✨, 🏆, ⚠️, 💰, 🎉, etc.)
  visible: boolean;   // true = show, false = hide
}

// ============================================
// UPDATE THE PROMOTION BELOW
// ============================================

export const currentPromotion: PromotionConfig = {
  title: 'Black Friday Kickoff! 🔥',
  message: 'It is showtime! Special discounts are live today—move fast and win every customer. Top seller takes the crown!',
  variant: 'promo',
  icon: '🎯',
  visible: true,
};

// ============================================
// VARIANT EXAMPLES (Color Themes)
// ============================================
//
// 'promo'    → Purple/pink gradient (campaigns, special days)
// 'success'  → Green gradient (achievements, nearing goals)
// 'info'     → Blue gradient (announcements, new features)
// 'warning'  → Orange/yellow gradient (heads-up alerts)

// ============================================
// SAMPLE PROMOTIONS (copy & paste)
// ============================================

/*
// Black Friday
{
  title: 'Black Friday Kickoff! 🔥',
  message: 'Showtime! Special deals are live today—move fast and win customers.',
  variant: 'promo',
  icon: '🎯',
  visible: true,
}

// New Year Campaign
{
  title: 'New Year Campaign 🎄',
  message: 'New year specials! Give your customers outstanding offers.',
  variant: 'promo',
  icon: '🎅',
  visible: true,
}

// Goal Incoming
{
  title: 'Goal Incoming! 🏆',
  message: 'Only $5K left for the team goal! One final push.',
  variant: 'success',
  icon: '🚀',
  visible: true,
}

// New Feature Announcement
{
  title: 'New Feature ✨',
  message: 'Installments are live! Track installment sales easily.',
  variant: 'info',
  icon: '🆕',
  visible: true,
}

// System Maintenance
{
  title: 'Heads-up! System Maintenance ⚠️',
  message: 'Short maintenance window at 18:00 today. Please finish your tasks.',
  variant: 'warning',
  icon: '🔧',
  visible: true,
}

// Motivation Boost
{
  title: "You're Crushing It! 💪",
  message: 'We are breaking records this week! Keep pushing your best.',
  variant: 'success',
  icon: '⭐',
  visible: true,
}

// Weekend Special
{
  title: 'Weekend Special 🎉',
  message: 'Extra bonuses on Saturday-Sunday! Do not miss the weekend sales.',
  variant: 'promo',
  icon: '💰',
  visible: true,
}

// Hide the Banner
{
  title: '',
  message: '',
  variant: 'info',
  icon: '',
  visible: false,  // ← Toggle true/false to show or hide the banner
}
*/
