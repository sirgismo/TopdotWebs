<?php
/**
 * Shared helpers for partials.
 */
function topdot_site_base_url(): string {
    $docRoot = $_SERVER["DOCUMENT_ROOT"] ?? "";
    $scriptName = $_SERVER["SCRIPT_NAME"] ?? "";

    $looksLikeSiteRoot = function (string $path): bool {
        if ($path === "") return false;
        $sep = DIRECTORY_SEPARATOR;
        // Heuristic: detect the deployed "topdotSite" root folder.
        // Don't key this on legacy folders (Blog/Projects) since they may be removed post-migration.
        return
            is_file($path . $sep . "index.html") &&
            is_dir($path . $sep . "css") &&
            is_dir($path . $sep . "js") &&
            is_dir($path . $sep . "partials") &&
            is_dir($path . $sep . "data") &&
            is_dir($path . $sep . "images");
    };

    if ($looksLikeSiteRoot($docRoot)) return "";

    $first = explode("/", trim($scriptName, "/"))[0] ?? "";
    if ($first !== "" && $looksLikeSiteRoot($docRoot . DIRECTORY_SEPARATOR . $first)) {
        return "/" . $first;
    }

    return "";
}
