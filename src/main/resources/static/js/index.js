document.addEventListener("DOMContentLoaded", function () {
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.15 };
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, observerOptions);
    const sections = document.querySelectorAll('.fade-in-section');
    sections.forEach(section => { observer.observe(section); });
});