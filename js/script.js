document.addEventListener('DOMContentLoaded', () => {
    // Parallax Effect
    const depthBg = document.querySelector('.depth-background');
    const particles = document.querySelector('.particles');
    const heroTitle = document.querySelector('.hero-title');

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        // Move background slower than scroll
        if (depthBg) {
            depthBg.style.transform = `translateY(${scrollY * 0.5}px)`;
        }

        // Move particles slightly
        if (particles) {
            particles.style.transform = `translateY(${scrollY * 0.2}px)`;
        }

        // Fade out hero title
        if (heroTitle) {
            const opacity = 1 - (scrollY / 500);
            heroTitle.style.opacity = Math.max(0, opacity);
            heroTitle.style.transform = `translateY(${scrollY * 0.4}px)`;
        }
    });

    // Simple Glitch Effect on Hover for Buttons via JS (optional reinforcement)
    const glitchButtons = document.querySelectorAll('.glitch-btn');

    glitchButtons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            const originalText = btn.querySelector('.btn-text').innerText;
            // Simple text scramble could go here if desired
        });
    });

    // Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Carousel Logic
    const track = document.querySelector('.carousel-track');
    if (track) {
        const slides = Array.from(track.children);
        const nextButton = document.querySelector('.carousel-btn.next');
        const prevButton = document.querySelector('.carousel-btn.prev');
        const dotsNav = document.querySelector('.carousel-nav');
        const dots = Array.from(dotsNav.children);

        const updateSlide = (currentSlide, targetSlide) => {
            currentSlide.classList.remove('current-slide');
            targetSlide.classList.add('current-slide');
        }

        const updateDots = (currentDot, targetDot) => {
            currentDot.classList.remove('current-indicator');
            targetDot.classList.add('current-indicator');
        }

        const moveToNextSlide = () => {
            const currentSlide = track.querySelector('.current-slide');
            const currentDot = dotsNav.querySelector('.current-indicator');

            let nextSlide = currentSlide.nextElementSibling;
            let nextDot = currentDot.nextElementSibling;

            // Loop back to start
            if (!nextSlide) {
                nextSlide = slides[0];
                nextDot = dots[0];
            }

            updateSlide(currentSlide, nextSlide);
            updateDots(currentDot, nextDot);
        }

        const moveToPrevSlide = () => {
            const currentSlide = track.querySelector('.current-slide');
            const currentDot = dotsNav.querySelector('.current-indicator');

            let prevSlide = currentSlide.previousElementSibling;
            let prevDot = currentDot.previousElementSibling;

            // Loop back to end
            if (!prevSlide) {
                prevSlide = slides[slides.length - 1];
                prevDot = dots[dots.length - 1];
            }

            updateSlide(currentSlide, prevSlide);
            updateDots(currentDot, prevDot);
        }

        nextButton.addEventListener('click', moveToNextSlide);
        prevButton.addEventListener('click', moveToPrevSlide);

        dotsNav.addEventListener('click', e => {
            const targetDot = e.target.closest('button');
            if (!targetDot) return;

            const currentSlide = track.querySelector('.current-slide');
            const currentDot = dotsNav.querySelector('.current-indicator');
            const targetIndex = dots.findIndex(dot => dot === targetDot);
            const targetSlide = slides[targetIndex];

            updateSlide(currentSlide, targetSlide);
            updateDots(currentDot, targetDot);
        });
    }
});
