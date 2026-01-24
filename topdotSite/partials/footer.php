<?php
/**
 * Shared footer include.
 *
 * Goal: one source of truth for footer HTML, without changing URLs.
 * This file is safe to include from any depth (Blog/, Projects/, etc.)
 * because it builds links using the site "base URL" ('' or '/topdot').
 */
function topdot_site_base_url(): string {
    $docRoot = $_SERVER["DOCUMENT_ROOT"] ?? "";
    $scriptName = $_SERVER["SCRIPT_NAME"] ?? "";

    $looksLikeSiteRoot = function (string $path): bool {
        if ($path === "") return false;
        $sep = DIRECTORY_SEPARATOR;
        return is_file($path . $sep . "index.html") && is_dir($path . $sep . "Blog") && is_dir($path . $sep . "Projects");
    };

    // If the document root itself is the site root (production), no base prefix is needed.
    if ($looksLikeSiteRoot($docRoot)) return "";

    // Otherwise (local Laragon), the site is usually served from a subdirectory like "/topdot".
    $first = explode("/", trim($scriptName, "/"))[0] ?? "";
    if ($first !== "" && $looksLikeSiteRoot($docRoot . DIRECTORY_SEPARATOR . $first)) {
        return "/" . $first;
    }

    return "";
}

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
