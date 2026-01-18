

'use strict';

// =========================================== //
// DEBOUNCE UTILITY
// =========================================== //

const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

// =========================================== //
// 3D CARD SLIDER (AUTO + TOUCH + DRAG + TAP TO VIEW)
// =========================================== //

const Slider3D = {
    currentIndex: 0,
    isAnimating: false,
    autoSlideInterval: null,
    cards: [],
    totalCards: 0,
    isPaused: false,
    
    // drag state
    dragStartX: 0,
    dragCurrentX: 0,
    isDragging: false,
    
    // tap to view
    tapStartTime: 0,
    tapStartX: 0,
    tapStartY: 0,
    tapThreshold: 300, // ms for long press
    moveThreshold: 10, // pixels for tap vs swipe

    init() {
        this.cards = Array.from(document.querySelectorAll('.slider-card'));
        this.totalCards = this.cards.length;

        if (this.totalCards < 2) return;

        this.updateCardPositions();
        this.startAutoRotation();
        this.setupEventListeners();
        this.setupTouchEvents();
        this.setupDragEvents();
        this.setupTapToViewEvents();
        this.playActiveCardVideo();
    },

    updateCardPositions() {
        this.cards.forEach((card, index) => {
            card.classList.remove('prev', 'active', 'next', 'hidden');

            const pos = (index - this.currentIndex + this.totalCards) % this.totalCards;

            if (pos === this.totalCards - 1) card.classList.add('prev');
            else if (pos === 0) card.classList.add('active');
            else if (pos === 1) card.classList.add('next');
            else card.classList.add('hidden');
        });

        this.playActiveCardVideo();
    },

    slideNext() {
        if (this.isAnimating || this.isPaused) return;
        this.isAnimating = true;
        this.currentIndex = (this.currentIndex + 1) % this.totalCards;
        this.updateCardPositions();
        setTimeout(() => (this.isAnimating = false), 600);
    },

    slidePrev() {
        if (this.isAnimating || this.isPaused) return;
        this.isAnimating = true;
        this.currentIndex =
            (this.currentIndex - 1 + this.totalCards) % this.totalCards;
        this.updateCardPositions();
        setTimeout(() => (this.isAnimating = false), 600);
    },

    playActiveCardVideo() {
        document.querySelectorAll('.slider-card video').forEach(v => {
            v.pause();
            v.currentTime = 0;
        });

        const active = document.querySelector('.slider-card.active video');
        if (active) {
            active.muted = true;
            active.loop = true;
            active.playsInline = true;
            active.play().catch(() => {});
        }
    },

    startAutoRotation() {
        this.stopAutoRotation();
        this.autoSlideInterval = setInterval(() => {
            if (!this.isPaused && !document.hidden) {
                this.slideNext();
            }
        }, 4000);
    },

    stopAutoRotation() {
        if (this.autoSlideInterval) {
            clearInterval(this.autoSlideInterval);
            this.autoSlideInterval = null;
        }
    },

    setupEventListeners() {
        const container = document.querySelector('.slider-3d-container');
        if (!container) return;

        container.addEventListener('mouseenter', () => {
            if (window.innerWidth > 768) {
                this.isPaused = true;
                this.stopAutoRotation();
            }
        });

        container.addEventListener('mouseleave', () => {
            if (window.innerWidth > 768) {
                this.isPaused = false;
                this.startAutoRotation();
            }
        });

        // Click for next/prev - only for desktop
        container.addEventListener('click', e => {
            if (window.innerWidth > 768) {
                if (e.target.closest('.slider-card.prev')) this.slidePrev();
                if (e.target.closest('.slider-card.next')) this.slideNext();
            }
        });
    },

    // ---------- MOBILE TOUCH ----------
    setupTouchEvents() {
        const track = document.querySelector('.slider-track');
        if (!track) return;

        let startX = 0;
        let endX = 0;

        track.addEventListener(
            'touchstart',
            e => {
                startX = e.touches[0].clientX;
                this.isPaused = true;
                this.stopAutoRotation();
            },
            { passive: true }
        );

        track.addEventListener(
            'touchmove',
            e => {
                endX = e.touches[0].clientX;
            },
            { passive: true }
        );

        track.addEventListener(
            'touchend',
            () => {
                const diff = startX - endX;
                if (Math.abs(diff) > 50) {
                    diff > 0 ? this.slideNext() : this.slidePrev();
                }

                setTimeout(() => {
                    this.isPaused = false;
                    this.startAutoRotation();
                }, 2000);
            },
            { passive: true }
        );
    },

    // ---------- DESKTOP / HAND DRAG ----------
    setupDragEvents() {
        const track = document.querySelector('.slider-track');
        if (!track) return;

        const threshold = 60;

        track.addEventListener('pointerdown', e => {
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragCurrentX = e.clientX;
            this.isPaused = true;
            this.stopAutoRotation();
            track.setPointerCapture(e.pointerId);
        });

        track.addEventListener('pointermove', e => {
            if (!this.isDragging) return;
            this.dragCurrentX = e.clientX;
        });

        track.addEventListener('pointerup', () => {
            if (!this.isDragging) return;

            const diff = this.dragStartX - this.dragCurrentX;

            if (Math.abs(diff) > threshold) {
                diff > 0 ? this.slideNext() : this.slidePrev();
            }

            this.isDragging = false;

            setTimeout(() => {
                this.isPaused = false;
                this.startAutoRotation();
            }, 2000);
        });

        track.addEventListener('pointercancel', () => {
            this.isDragging = false;
            this.isPaused = false;
            this.startAutoRotation();
        });
    },

    // ---------- TAP TO VIEW FULLSCREEN ----------
    setupTapToViewEvents() {
        const track = document.querySelector('.slider-track');
        if (!track) return;

        // Touch events for mobile
        track.addEventListener('touchstart', (e) => {
            this.tapStartTime = Date.now();
            this.tapStartX = e.touches[0].clientX;
            this.tapStartY = e.touches[0].clientY;
        }, { passive: true });

        track.addEventListener('touchend', (e) => {
            const endTime = Date.now();
            const duration = endTime - this.tapStartTime;
            
            // Only handle tap (not swipe or long press)
            if (duration < this.tapThreshold && duration > 50) {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const moveX = Math.abs(endX - this.tapStartX);
                const moveY = Math.abs(endY - this.tapStartY);
                
                // If it's a tap (not a swipe)
                if (moveX < this.moveThreshold && moveY < this.moveThreshold) {
                    this.openActiveCardFullscreen();
                }
            }
        }, { passive: true });

        // Click events for desktop
        track.addEventListener('click', (e) => {
            // Only trigger on desktop if not dragging and not clicking on nav buttons
            if (window.innerWidth > 768 && 
                !this.isDragging && 
                !e.target.closest('.slider-card.prev') && 
                !e.target.closest('.slider-card.next')) {
                this.openActiveCardFullscreen();
            }
        });
    },

    openActiveCardFullscreen() {
        const activeCard = document.querySelector('.slider-card.active');
        if (!activeCard) return;

        // Pause auto rotation temporarily
        this.isPaused = true;
        this.stopAutoRotation();

        // Get card content
        const cardTitle = activeCard.querySelector('.card-title')?.textContent || 'Portfolio Item';
        const cardImage = activeCard.querySelector('img')?.src || '';
        const cardVideo = activeCard.querySelector('video')?.src || '';
        const cardType = cardVideo ? 'video' : 'image';
        
        // Use the same ModalManager to open modal for consistency
        ModalManager.openImageModal(cardImage || cardVideo, cardType, cardTitle);
    }
};

// =========================================== //
// VIDEO AUTOPLAY FOR PORTFOLIO SECTION
// =========================================== //

const VideoAutoplay = {
    init: function() {
        this.setupPortfolioVideos();
    },
    
    setupPortfolioVideos: function() {
        const videos = document.querySelectorAll('.portfolio-media video, .scroll-animate-video');
        
        videos.forEach(video => {
            video.muted = true;
            video.playsInline = true;
            video.loop = true;
            video.preload = 'metadata';
            
            // Setup intersection observer for autoplay
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        video.play().catch(e => {
                            // Silent fail for autoplay restrictions
                        });
                    } else {
                        if (!video.paused) {
                            video.pause();
                        }
                    }
                });
            }, { 
                threshold: 0.3,
                rootMargin: '50px'
            });
            
            observer.observe(video);
        });
    }
};

// =========================================== //
// PORTFOLIO FILTER SYSTEM
// =========================================== //

const PortfolioManager = {
    items: [],
    filters: [],
    currentFilter: 'all',
    isFiltering: false,
    
    init: function() {
        this.items = Array.from(document.querySelectorAll('.portfolio-item'));
        this.filters = Array.from(document.querySelectorAll('.filter-btn'));
        
        // Setup filter buttons
        this.setupFilters();
        
        // Setup click events
        this.setupPortfolioClickEvents();
    },
    
    setupFilters: function() {
        this.filters.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                
                if (btn.classList.contains('active') || this.isFiltering) return;
                
                // Update active button
                this.filters.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Filter items
                const filter = btn.dataset.filter;
                this.currentFilter = filter;
                this.filterItems(filter);
            });
        });
    },
    
    filterItems: function(filter) {
        this.isFiltering = true;
        
        this.items.forEach(item => {
            const category = item.getAttribute('data-category');
            const shouldShow = filter === 'all' || category === filter;
            
            if (shouldShow) {
                item.style.display = 'block';
                setTimeout(() => {
                    item.classList.add('visible');
                    item.classList.remove('hidden');
                }, 50);
            } else {
                item.classList.remove('visible');
                item.classList.add('hidden');
                setTimeout(() => {
                    item.style.display = 'none';
                }, 300);
            }
        });
        
        setTimeout(() => {
            this.isFiltering = false;
        }, 400);
    },
    
    setupPortfolioClickEvents: function() {
        document.addEventListener('click', (e) => {
            // View details button triggers modal
            const viewBtn = e.target.closest('.view-details-btn, .view-project-btn');
            if (viewBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                const imageSrc = viewBtn.dataset.image;
                const type = viewBtn.dataset.type || 'image';
                const title = viewBtn.dataset.title || 'Portfolio Item';
                
                if (imageSrc) {
                    ModalManager.openImageModal(imageSrc, type, title);
                }
                return;
            }
        });
    }
};

// =========================================== //
// TYPEWRITER EFFECT
// =========================================== //

const TypeWriter = {
    strings: [
        "Visual Designer",
        "Motion Graphics Artist",
        "Brand Identity Specialist",
        "Creative Problem Solver",
        "Digital Experience Creator"
    ],
    currentStringIndex: 0,
    currentCharIndex: 0,
    isDeleting: false,
    typingSpeed: 100,
    cursorInterval: null,
    
    init: function() {
        const typedTextElement = document.getElementById('typed-text');
        const cursorElement = document.querySelector('.cursor');
        
        if (!typedTextElement) return;
        
        // Start blinking cursor
        this.startCursorBlink(cursorElement);
        
        // Start typing effect
        setTimeout(() => {
            this.typeEffect(typedTextElement);
        }, 1500);
    },
    
    startCursorBlink: function(cursorElement) {
        if (!cursorElement) return;
        
        this.cursorInterval = setInterval(() => {
            cursorElement.style.opacity = cursorElement.style.opacity === '1' ? '0' : '1';
        }, 500);
    },
    
    typeEffect: function(element) {
        const currentString = this.strings[this.currentStringIndex];
        
        if (this.isDeleting) {
            element.textContent = currentString.substring(0, this.currentCharIndex - 1);
            this.currentCharIndex--;
            this.typingSpeed = 50;
        } else {
            element.textContent = currentString.substring(0, this.currentCharIndex + 1);
            this.currentCharIndex++;
            this.typingSpeed = 100;
        }
        
        if (!this.isDeleting && this.currentCharIndex === currentString.length) {
            this.isDeleting = true;
            this.typingSpeed = 1500;
        } else if (this.isDeleting && this.currentCharIndex === 0) {
            this.isDeleting = false;
            this.currentStringIndex = (this.currentStringIndex + 1) % this.strings.length;
            this.typingSpeed = 500;
        }
        
        setTimeout(() => this.typeEffect(element), this.typingSpeed);
    }
};

// =========================================== //
// MODAL MANAGER (PROJECTS SECTION STYLE)
// =========================================== //

const ModalManager = {
    modal: null,
    currentMediaType: '',
    currentSrc: '',
    
    init: function() {
        this.createModal();
    },
    
    createModal: function() {
        // Remove existing modal if any
        const existingModal = document.querySelector('.image-modal');
        if (existingModal) existingModal.remove();
        
        // Create modal structure (projects section style)
        this.modal = document.createElement('div');
        this.modal.className = 'image-modal';
        this.modal.setAttribute('aria-hidden', 'true');
        this.modal.innerHTML = `
            <div class="modal-content">
                <button class="close-modal" aria-label="Close modal">&times;</button>
                <div class="modal-body"></div>
                <div class="modal-controls">
                    <button class="modal-btn download-btn" aria-label="Download">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="modal-btn secondary fullscreen-btn" aria-label="Fullscreen">
                        <i class="fas fa-expand"></i> Fullscreen
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        
        // Setup event listeners
        this.setupModalEvents();
    },
    
    setupModalEvents: function() {
        const closeBtn = this.modal.querySelector('.close-modal');
        
        closeBtn.addEventListener('click', () => this.closeModal());
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
        
        // Download button
        const downloadBtn = this.modal.querySelector('.download-btn');
        downloadBtn.addEventListener('click', () => {
            if (this.currentSrc) {
                const link = document.createElement('a');
                link.href = this.currentSrc;
                link.download = `design-${Date.now()}.${this.currentMediaType === 'image' ? 'jpg' : 'mp4'}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
        
        // Fullscreen button
        const fullscreenBtn = this.modal.querySelector('.fullscreen-btn');
        fullscreenBtn.addEventListener('click', () => {
            const media = this.modal.querySelector('video, img');
            if (media) {
                if (media.requestFullscreen) {
                    media.requestFullscreen();
                } else if (media.webkitRequestFullscreen) {
                    media.webkitRequestFullscreen();
                } else if (media.msRequestFullscreen) {
                    media.msRequestFullscreen();
                }
            }
        });
    },
    
    openImageModal: function(src, type, title) {
        if (!this.modal) this.createModal();
        
        this.currentSrc = src;
        this.currentMediaType = type;
        
        const modalBody = this.modal.querySelector('.modal-body');
        modalBody.innerHTML = '';
        
        if (type === 'video') {
            const video = document.createElement('video');
            video.src = src;
            video.controls = true;
            video.autoplay = true;
            video.style.maxWidth = '90vw';
            video.style.maxHeight = '80vh';
            modalBody.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.src = src;
            img.alt = title;
            img.style.maxWidth = '90vw';
            img.style.maxHeight = '80vh';
            modalBody.appendChild(img);
        }
        
        document.body.style.overflow = 'hidden';
        this.modal.classList.add('active');
        this.modal.setAttribute('aria-hidden', 'false');
    },
    
    closeModal: function() {
        if (!this.modal) return;
        
        // Pause any video
        const video = this.modal.querySelector('video');
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
        
        this.modal.classList.remove('active');
        setTimeout(() => {
            document.body.style.overflow = '';
        }, 300);
        this.modal.setAttribute('aria-hidden', 'true');
    }
};

// =========================================== //
// THEME MANAGER
// =========================================== //

const ThemeManager = {
    init: function() {
        const toggleBtn = document.getElementById('mode-toggle');
        if (!toggleBtn) return;
        
        const icon = toggleBtn.querySelector('i');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        
        // Set initial theme
        if (savedTheme === 'light' || (!savedTheme && !prefersDark)) {
            document.body.classList.add('light-mode');
            if (icon) icon.className = 'fas fa-sun';
        } else {
            document.body.classList.remove('light-mode');
            if (icon) icon.className = 'fas fa-moon';
        }
        
        // Toggle theme on click
        toggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            
            if (document.body.classList.contains('light-mode')) {
                localStorage.setItem('theme', 'light');
                if (icon) icon.className = 'fas fa-sun';
                this.showNotification('Light Mode', 'Switched to light theme', 'sun');
            } else {
                localStorage.setItem('theme', 'dark');
                if (icon) icon.className = 'fas fa-moon';
                this.showNotification('Dark Mode', 'Switched to dark theme', 'moon');
            }
        });
    },
    
    showNotification: function(title, message, icon) {
        const notification = document.createElement('div');
        notification.className = 'notification-popup';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="notification-text">
                    <h4>${title}</h4>
                    <p>${message}</p>
                </div>
                <button class="close-notification">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
};

// =========================================== //
// SCROLL ANIMATIONS
// =========================================== //

const ScrollAnimations = {
    init: function() {
        this.animateOnScroll();
        window.addEventListener('scroll', () => this.animateOnScroll());
    },
    
    animateOnScroll: function() {
        const elements = document.querySelectorAll('.scroll-animate, .scroll-fade-in');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('visible');
            }
        });
    }
};

// =========================================== //
// PERFORMANCE OPTIMIZATIONS
// =========================================== //

const PerformanceManager = {
    init: function() {
        this.lazyLoadImages();
        this.debounceScrollEvents();
    },
    
    lazyLoadImages: function() {
        const images = document.querySelectorAll('img[data-src]');
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    },
    
    debounceScrollEvents: function() {
        let ticking = false;
        
        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    // Update any scroll-dependent animations here
                    ticking = false;
                });
                ticking = true;
            }
        };
        
        window.addEventListener('scroll', onScroll, { passive: true });
    }
};

// =========================================== //
// CONTACT FORM MANAGER
// =========================================== //

const ContactFormManager = {
    init: function() {
        const contactForm = document.getElementById('contactForm');
        if (!contactForm) return;
        
        const successMessage = document.getElementById('successMessage');
        if (successMessage) {
            successMessage.style.display = 'none';
        }
        
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            // Basic validation
            if (!this.validateForm(contactForm)) return;
            
            // Show loading state
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;
            
            try {
                const formData = new FormData(contactForm);
                const response = await fetch(contactForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' }
                });
                
                if (response.ok) {
                    // Show success message
                    contactForm.style.display = 'none';
                    if (successMessage) {
                        successMessage.style.display = 'block';
                    }
                    
                    // Show notification
                    ThemeManager.showNotification('Message Sent!', 'I will get back to you within 24 hours.', 'check-circle');
                    
                    // Reset form
                    contactForm.reset();
                } else {
                    throw new Error('Form submission failed');
                }
            } catch (error) {
                console.error('Form submission error:', error);
                ThemeManager.showNotification('Error', 'Failed to send message. Please try again.', 'exclamation-circle');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    },
    
    validateForm: function(form) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.style.borderColor = '#f72585';
                
                field.addEventListener('input', () => {
                    field.style.borderColor = '';
                }, { once: true });
            }
        });
        
        return isValid;
    }
};

// =========================================== //
// MAIN INITIALIZATION - SINGLE EVENT LISTENER
// =========================================== //

document.addEventListener('DOMContentLoaded', () => {
    console.log('Portfolio initializing...');
    
    // Initialize all components (Mobile menu is pure CSS, no JavaScript needed)
    ThemeManager.init();
    ModalManager.init();
    TypeWriter.init();
    Slider3D.init();
    PortfolioManager.init();
    ContactFormManager.init();
    VideoAutoplay.init();
    ScrollAnimations.init();
    PerformanceManager.init();
    
    // Mark page as loaded
    document.body.classList.add('page-loaded');
    
    console.log('Portfolio initialized successfully');
    
    // Show welcome notification
    setTimeout(() => {
        ThemeManager.showNotification(
            'Welcome!', 
            'Tap/click on any card or project to view details.',
            'paint-brush'
        );
    }, 2000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Clean up slider interval
    if (Slider3D.autoSlideInterval) {
        clearInterval(Slider3D.autoSlideInterval);
    }
    
    // Clean up typewriter
    if (TypeWriter.cursorInterval) {
        clearInterval(TypeWriter.cursorInterval);
    }
    
    // Close any open modals
    ModalManager.closeModal();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, pause animations
        if (Slider3D.autoSlideInterval) {
            clearInterval(Slider3D.autoSlideInterval);
            Slider3D.autoSlideInterval = null;
        }
    } else {
        // Page is visible, resume animations
        if (!Slider3D.autoSlideInterval && !Slider3D.isPaused) {
            Slider3D.startAutoRotation();
        }
    }
});