<?php
//footer
?>
<style>
/* Static footer styles */
.app-footer {
    width: 100%;
    box-sizing: border-box;
    padding: 20px;
    background: #333;
    color: #ddd;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    font-size: 0.9em;
    margin-top: auto; /* Push to bottom if flex container allows, though body is block now */
    border-top: 1px solid #444;
}

/* Footer internal groups */
.footer-left,
.footer-right {
    display: flex;
    align-items: center;
    gap: 15px;
    flex-wrap: wrap;
}

/* Small link style */
.app-footer a.tiny-text {
    color: #ccc;
    text-decoration: none;
    transition: color 0.2s;
}

.app-footer a.tiny-text:hover {
    color: #fff;
    text-decoration: underline;
}

/* Responsive tweaks */
@media (max-width: 768px) {
    .app-footer {
        flex-direction: column;
        align-items: center;
        text-align: center;
    }
    
    .footer-left,
    .footer-right {
        justify-content: center;
        gap: 10px;
    }
}
</style>
<br><br>
<footer class="app-footer" role="contentinfo">
    <div class="footer-left">
        <span>© <span id="footer-year"></span> Simple Video Editor</span>
        <span style="color:#888;">v0.2.0</span>
        <a href="help.html" class="tiny-text">Help</a>
    </div>

    <div class="footer-right">
        <a href="https://gyanmarg.guru/cookie.php" class="tiny-text">Cookie Policy</a>
        <a href="https://gyanmarg.guru/disclaimer.php" class="tiny-text">Disclaimer</a>
        <a href="https://gyanmarg.guru/privacy.php" class="tiny-text">Privacy</a>
        <a href="https://gyanmarg.guru/terms.php" class="tiny-text">Terms &amp; Conditions</a>
        <a href="https://gyanmarg.guru/support.php" class="tiny-text">Help &amp; Support</a>
        <a href="https://gyanmarg.guru" class="tiny-text">Gyanmarg Portal</a>
    </div>
</footer>

<script>
    // Simple script just to set the year
    (function() {
        const yearEl = document.getElementById('footer-year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();
    })();
</script>
