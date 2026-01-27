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
        return is_file($path . $sep . "index.html") && is_dir($path . $sep . "Blog") && is_dir($path . $sep . "Projects");
    };

    if ($looksLikeSiteRoot($docRoot)) return "";

    $first = explode("/", trim($scriptName, "/"))[0] ?? "";
    if ($first !== "" && $looksLikeSiteRoot($docRoot . DIRECTORY_SEPARATOR . $first)) {
        return "/" . $first;
    }

    return "";
}
