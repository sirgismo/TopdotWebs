<?php
/**
 * Shared header include.
 */
require_once __DIR__ . "/base.php";
$base = topdot_site_base_url();
?>

<header class="site-header">
    <div id="logo">
        <a href="<?php echo $base; ?>/index.html">
            <div id="logoImage">
                <img src="<?php echo $base; ?>/images/circleLogo.png" class="topdotLogo" alt="">
            </div>
        </a>
        <a href="<?php echo $base; ?>/index.html" title="">
            <div id="logoText">
                topdot architects
            </div>
        </a>
    </div>

    <nav id="menu" aria-label="Primary navigation">
        <a id="homeButton" href="<?php echo $base; ?>/index.html" onclick="selectLink(this)">Home</a>
        <a href="<?php echo $base; ?>/projects.html" onclick="selectLink(this)">Projects</a>
        <a href="<?php echo $base; ?>/practice.html" onclick="selectLink(this)">Practice</a>
        <a href="<?php echo $base; ?>/blog.html" onclick="selectLink(this)">Blog</a>
        <a href="<?php echo $base; ?>/contact.html" onclick="selectLink(this)">Contact</a>
    </nav>

    <a href="javascript:void(0);" class="icon" id="menuToggle" onclick="myFunction()" aria-label="Open menu" aria-controls="menu" aria-expanded="false">
        <i class="fa fa-bars"></i>
    </a>
</header>

<div id="menuScrim" class="menu-scrim" aria-hidden="true"></div>
<div id="menuLines" class="menu-lines" aria-hidden="true"></div>
