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
            </div>

            <div class="site-footer__signup" aria-label="Email signup">
                <div class="sender-form-field" data-sender-form-id="lj2ztg7iaazkzb0k60o"></div>
            </div>
        </div>
    </div>

    <div class="site-footer__copyright" aria-label="Copyright">
        © 2025 topdot architects. All rights reserved.
    </div>
</footer>

<script>
  (function (s, e, n, d, er) {
    s['Sender'] = er;
    s[er] = s[er] || function () {
      (s[er].q = s[er].q || []).push(arguments);
    }, s[er].l = 1 * new Date();
    var a = e.createElement(n),
      m = e.getElementsByTagName(n)[0];
    a.async = 1;
    a.src = d;
    m.parentNode.insertBefore(a, m);
  })(window, document, 'script', 'https://cdn.sender.net/accounts_resources/universal.js', 'sender');
  sender('3ba11c462d5629');
</script>
