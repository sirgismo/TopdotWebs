<?php
/**
 * Shared footer include.
 */
require_once __DIR__ . "/base.php";
$base = topdot_site_base_url();
?>

<footer class="site-footer" aria-label="Footer">
    <div class="site-footer__main site-footer__main--minimal" aria-label="Footer content">
        <form class="footer-newsletter" action="#" method="post" aria-label="Newsletter signup">
            <div class="footer-newsletter__row">
                <label class="footer-newsletter__label" for="newsletterEmail">Newsletter</label>

                <div class="footer-newsletter__field">
                    <input
                        id="newsletterEmail"
                        class="footer-newsletter__input"
                        name="email"
                        type="email"
                        placeholder="Email"
                        autocomplete="email"
                        required
                    />

                    <button class="footer-newsletter__send" type="submit" aria-label="Send newsletter signup" disabled>
                        <svg class="footer-newsletter__send-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        </form>

        <div class="site-footer__socialbar" aria-label="Social links">
        <a class="site-footer__socialicon" href="https://www.instagram.com/topdotarchitects" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5z" fill="none" stroke="currentColor" stroke-width="1.5"/>
                <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="none" stroke="currentColor" stroke-width="1.5"/>
                <path d="M17.5 6.5h.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        </a>
        <a class="site-footer__socialicon" href="#" rel="noopener noreferrer" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 9.5h3V20H4V9.5z" fill="currentColor"/>
                <path d="M5.5 4a1.75 1.75 0 1 0 0 3.5A1.75 1.75 0 0 0 5.5 4z" fill="currentColor"/>
                <path d="M10 9.5h2.9v1.43h.04c.4-.76 1.4-1.56 2.88-1.56 3.08 0 3.65 2.03 3.65 4.67V20H16.5v-5.06c0-1.21-.02-2.76-1.68-2.76-1.68 0-1.94 1.31-1.94 2.67V20H10V9.5z" fill="currentColor"/>
            </svg>
        </a>
        <a class="site-footer__socialicon" href="https://www.facebook.com/topdotarchitects" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M14 8.5V7c0-.83.67-1.5 1.5-1.5H17V3h-2.2C12.7 3 11 4.7 11 6.8V8.5H9v3h2V21h3v-9.5h2.6l.4-3H14z" fill="currentColor"/>
            </svg>
        </a>
        </div>
    </div>

    <div class="site-footer__bottom" aria-label="Footer bottom">
        <div class="site-footer__copyright" aria-label="Copyright">
            © 2026 topdot architects.
        </div>
    </div>
</footer>

<script>
  (function () {
    const input = document.getElementById('newsletterEmail');
    const button = document.querySelector('.footer-newsletter__send');
    if (!input || !button) return;

    const sync = () => {
      button.disabled = !input.checkValidity();
    };

    input.addEventListener('input', sync, { passive: true });
    input.addEventListener('blur', sync, { passive: true });
    sync();
  })();
</script>
