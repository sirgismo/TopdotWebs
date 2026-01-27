<?php
/**
 * Shared footer include.
 */
require_once __DIR__ . "/base.php";
$base = topdot_site_base_url();
?>

<div id="footerbar">
    <div class="footer-column">
        <p class="footer-column-title">Projects</p>
        <p><a href="<?php echo $base; ?>/Projects/ArtInstallation/">Art Installation</a></p>
        <p><a href="<?php echo $base; ?>/Projects/customResidential.html">Custom Residential</a></p>
        <p><a href="<?php echo $base; ?>/Projects/multiUnit-Commercial-MixedUse.html">Multi-Unit | Commercial | Mixed-Use</a></p>
    </div>

    <div class="footer-column">
        <p class="footer-column-title">Follow Us</p>
        <p><a href="<?php echo $base; ?>/blog.html">Blog</a></p>
        <p style="margin-block-end: 0.5em;">
            <a href="https://www.instagram.com/topdotarchitects" target="_blank" rel="noopener noreferrer">
                <img src="<?php echo $base; ?>/images/instagram.png" width="36" height="36" alt="" />
            </a>
        </p>
        <p style="margin-block-start: 0em;">
            <a href="https://www.facebook.com/topdotarchitects" target="_blank" rel="noopener noreferrer">
                <img src="<?php echo $base; ?>/images/fb.png" width="30" height="30" alt="" />
            </a>
        </p>
    </div>

    <div class="footer-column">
        <p class="footer-column-title">Contact Us</p>
        <p><a href="<?php echo $base; ?>/contact.html">Contact</a></p>
    </div>

    <div class="footer-column">
        <p class="footer-column-title">Subscribe For Future Content</p>
        <div class="sender-form-field" data-sender-form-id="lj2ztg7iaazkzb0k60o"></div>
    </div>
</div>

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
