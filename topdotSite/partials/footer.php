<?php
/**
 * Shared footer include.
 */
require_once __DIR__ . "/base.php";
$base = topdot_site_base_url();
?>

<footer class="site-footer" aria-label="Footer">
    <div class="site-footer__main" aria-label="Footer content">
        <div class="site-footer__col site-footer__col--left">
            <img class="site-footer__logo" src="<?php echo $base; ?>/images/circleLogo.png" alt="topdot logo" />
            <div class="site-footer__wordmark" aria-label="topdot architects">
                <div class="site-footer__wordmark-top">topdot</div>
                <div class="site-footer__wordmark-bottom">architects</div>
            </div>
        </div>

        <nav class="site-footer__col site-footer__col--center site-footer__nav" aria-label="Footer navigation">
            <a class="site-footer__nav-link" href="<?php echo $base; ?>/projects.html">Projects</a>
            <a class="site-footer__nav-link" href="<?php echo $base; ?>/contact.html">Contact</a>
            <a class="site-footer__nav-link" href="<?php echo $base; ?>/practice.html">About</a>
        </nav>

        <div class="site-footer__col site-footer__col--right" aria-label="Stay in touch">
            <div class="site-footer__right-title">Stay in touch</div>

            <div class="site-footer__social" aria-label="Social links">
                <a class="site-footer__social-link" href="https://www.instagram.com/topdotarchitects" target="_blank" rel="noopener noreferrer">Instagram</a>
                <a class="site-footer__social-link" href="#" rel="noopener noreferrer">LinkedIn</a>
                <a class="site-footer__social-link" href="https://www.facebook.com/topdotarchitects" target="_blank" rel="noopener noreferrer">Facebook</a>
                <a class="site-footer__social-link" href="#" aria-label="Newsletter (coming soon)">Newsletter</a>
            </div>
        </div>
    </div>

    <div class="site-footer__copyright" aria-label="Copyright">
        © 2026 topdot architects. All rights reserved.
    </div>
</footer>
