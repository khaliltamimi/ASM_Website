document.addEventListener('DOMContentLoaded', () => {
    
    // Dark Mode Toggle
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // Dark Mode Toggle Helper to sync both buttons
    function updateThemeToggleButtons(darkEnabled) {
        const toggles = document.querySelectorAll('.theme-toggle-btn');
        toggles.forEach(toggle => {
            toggle.textContent = darkEnabled ? '☀️' : '🌙';
        });
    }

    function createThemeToggle(isMobile) {
        const themeToggle = document.createElement('button');
        themeToggle.className = 'theme-toggle-btn';
        themeToggle.setAttribute('aria-label', 'Toggle Dark Mode');
        if (isMobile) {
            themeToggle.style.cssText = 'background: none; border: none; font-size: 1.5rem; cursor: pointer; margin-top: 1.5rem; color: white; transition: color 0.2s; display: block; text-align: center; width: 100%;';
        } else {
            themeToggle.style.cssText = 'background: none; border: none; font-size: 1.25rem; cursor: pointer; margin-left: 1rem; color: var(--color-text-light); transition: color 0.2s;';
        }
        themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
        
        themeToggle.addEventListener('click', () => {
            themeToggle.classList.add('clicked');
            setTimeout(() => themeToggle.classList.remove('clicked'), 600);
            document.body.classList.toggle('dark-mode');
            const darkEnabled = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', darkEnabled);
            updateThemeToggleButtons(darkEnabled);
        });
        
        return themeToggle;
    }

    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        navLinks.appendChild(createThemeToggle(false));
    }

    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-links a');

    function toggleMenu() {
        mobileMenuBtn.classList.toggle('active');
        mobileNavOverlay.classList.toggle('active');
        document.body.style.overflow = mobileNavOverlay.classList.contains('active') ? 'hidden' : '';
    }

    mobileMenuBtn.addEventListener('click', toggleMenu);

    mobileNavLinks.forEach(link => {
        link.addEventListener('click', toggleMenu);
    });

    // Dynamic Admin links for mobile navigation
    const mobileNavLinksContainer = document.querySelector('.mobile-nav-links');
    if (mobileNavLinksContainer) {
        // Add theme toggle to mobile navigation menu (above admin lines)
        const mobileThemeToggle = createThemeToggle(true);
        mobileThemeToggle.style.marginTop = '0.5rem';
        mobileNavLinksContainer.appendChild(mobileThemeToggle);

        const divider = document.createElement('div');
        divider.style.cssText = 'border-top: 1px solid rgba(255, 255, 255, 0.2); margin: 0.5rem 0; width: 100%;';
        mobileNavLinksContainer.appendChild(divider);

        const adminLinks = [
            { text: 'Admin: Events', href: 'admin.html' },
            { text: "Admin: Jumu'ah", href: 'admin_jumuah.html' },
            { text: 'Admin: Users', href: 'admin_users.html' },
            { text: 'Admin: Questions', href: 'admin_questions.html' }
        ];

        adminLinks.forEach(linkInfo => {
            const a = document.createElement('a');
            a.href = linkInfo.href;
            a.textContent = linkInfo.text;
            a.style.cssText = 'font-size: 1.1rem; opacity: 0.8;';
            mobileNavLinksContainer.appendChild(a);
        });
    }

    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    
    // Inject top Scroll Progress Bar
    const progressContainer = document.createElement('div');
    progressContainer.id = 'scroll-progress-container';
    progressContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 4px; background: rgba(0,0,0,0.05); z-index: 1002; pointer-events: none;';
    const progressBar = document.createElement('div');
    progressBar.id = 'scroll-progress';
    progressBar.style.cssText = 'width: 0%; height: 100%; background: linear-gradient(90deg, var(--color-secondary), var(--color-primary-light)); transition: width 0.1s ease-out;';
    progressContainer.appendChild(progressBar);
    document.body.appendChild(progressContainer);

    // Inject Circular Back to Top Button
    const backToTopBtn = document.createElement('button');
    backToTopBtn.className = 'back-to-top';
    backToTopBtn.setAttribute('aria-label', 'Back to top');
    backToTopBtn.innerHTML = `
        <svg class="progress-ring" width="50" height="50">
            <circle cx="25" cy="25" r="22"/>
        </svg>
        <span style="font-size: 1.5rem; position: relative; z-index: 2;">↑</span>
    `;
    document.body.appendChild(backToTopBtn);

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    const progressCircle = backToTopBtn.querySelector('circle');
    const radius = progressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    progressCircle.style.strokeDasharray = circumference;
    progressCircle.style.strokeDashoffset = circumference;

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        
        // Update top progress bar
        progressBar.style.width = `${scrollPercent}%`;

        // Update circular indicator
        if (scrollTop > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }

        const offset = circumference - (scrollPercent / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;

        // Navbar Shadow
        if (navbar) {
            if (scrollTop > 50) {
                navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                navbar.style.padding = '0';
            } else {
                navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
            }
        }
    });

    // Set Current Date in Prayer Times
    const dateDisplay = document.getElementById('current-date');
    if (dateDisplay) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
    }

    // Fetch live prayer times using Aladhan API for Milan, Italy
    async function fetchPrayerTimes() {
        try {
            // You can change 'method=2' (ISNA) to other calculation methods if needed
            const response = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Milan&country=Italy&method=2');
            const result = await response.json();
            
            if (result && result.data && result.data.timings) {
                const timings = result.data.timings;
                
                // Helper to convert 24h API time to 12h format
                const formatTime = (time24) => {
                    const [hours, minutes] = time24.split(':');
                    const h = parseInt(hours, 10);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const h12 = h % 12 || 12;
                    return `${h12}:${minutes} ${ampm}`;
                };

                const fajrEl = document.getElementById('fajr-time');
                if (fajrEl) fajrEl.textContent = formatTime(timings.Fajr);
                const dhuhrEl = document.getElementById('dhuhr-time');
                if (dhuhrEl) dhuhrEl.textContent = formatTime(timings.Dhuhr);
                const asrEl = document.getElementById('asr-time');
                if (asrEl) asrEl.textContent = formatTime(timings.Asr);
                const maghribEl = document.getElementById('maghrib-time');
                if (maghribEl) maghribEl.textContent = formatTime(timings.Maghrib);
                const ishaEl = document.getElementById('isha-time');
                if (ishaEl) ishaEl.textContent = formatTime(timings.Isha);

                // Highlight the next coming prayer
                const updateHighlight = () => {
                    const now = new Date();
                    const currentMinutes = now.getHours() * 60 + now.getMinutes();

                    const getMinutes = (time24) => {
                        const [hours, minutes] = time24.split(':');
                        return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
                    };

                    const prayers = [
                        { id: 'fajr-time', time: timings.Fajr },
                        { id: 'dhuhr-time', time: timings.Dhuhr },
                        { id: 'asr-time', time: timings.Asr },
                        { id: 'maghrib-time', time: timings.Maghrib },
                        { id: 'isha-time', time: timings.Isha }
                    ];

                    let nextPrayer = null;
                    for (const prayer of prayers) {
                        if (getMinutes(prayer.time) > currentMinutes) {
                            nextPrayer = prayer;
                            break;
                        }
                    }

                    // If all prayers today have passed, the next prayer is Fajr (tomorrow)
                    if (!nextPrayer) {
                        nextPrayer = prayers[0];
                    }

                    // Remove highlight from all prayer items
                    prayers.forEach(p => {
                        const element = document.getElementById(p.id);
                        if (element) {
                            const prayerItem = element.closest('.prayer-item');
                            if (prayerItem) {
                                prayerItem.classList.remove('highlight');
                            }
                        }
                    });

                    // Add highlight to the next prayer item
                    const nextElement = document.getElementById(nextPrayer.id);
                    if (nextElement) {
                        const nextPrayerItem = nextElement.closest('.prayer-item');
                        if (nextPrayerItem) {
                            nextPrayerItem.classList.add('highlight');
                        }
                    }
                };

                updateHighlight();
            }
        } catch (error) {
            console.error('Error fetching prayer times:', error);
            const fajrTime = document.getElementById('fajr-time');
            if (fajrTime) fajrTime.textContent = '--:--';
        }
    }

    fetchPrayerTimes();
    
    // Fetch daily Ayah using AlQuran API
    async function fetchDailyAyah() {
        try {
            // Get a random ayah between 1 and 6236
            const randomAyah = Math.floor(Math.random() * 6236) + 1;
            const response = await fetch(`http://api.alquran.cloud/v1/ayah/${randomAyah}/editions/quran-uthmani,en.asad`);
            const result = await response.json();
            
            if (result && result.data && result.data.length === 2) {
                const arabicData = result.data[0];
                const englishData = result.data[1];
                
                const arabicText = arabicData.text;
                const englishText = englishData.text;
                const surahName = englishData.surah.englishName;
                const ayahNumber = englishData.numberInSurah;
                
                const arabicDisplay = document.getElementById('daily-ayah-arabic');
                const englishDisplay = document.getElementById('daily-ayah-text');
                const ayahRef = document.getElementById('daily-ayah-ref');
                
                if (arabicDisplay && englishDisplay && ayahRef) {
                    arabicDisplay.textContent = arabicText;
                    englishDisplay.textContent = `"${englishText}"`;
                    ayahRef.textContent = `- Surah ${surahName} (${ayahNumber})`;
                }
            }
        } catch (error) {
            console.error('Error fetching Ayah:', error);
        }
    }

    fetchDailyAyah();
    
    // Form submission
    const form = document.querySelector('.contact-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
        const originalText = btn.textContent;
        btn.textContent = 'Subscribed!';
        btn.style.backgroundColor = '#047857';
        btn.style.color = 'white';
        form.reset();
        
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.backgroundColor = '';
                btn.style.color = '';
            }, 3000);
        });
    }

    // Friday Sunnah checklist functionality
    const sunnahList = document.getElementById('sunnah-checklist');
    if (sunnahList) {
        sunnahList.classList.add('checklist');
        const items = sunnahList.querySelectorAll('li');
        const todayStr = new Date().toISOString().split('T')[0]; // Reset checklist daily
        const savedChecksKey = `sunnahs-checked-${todayStr}`;

        // Get saved indexes from localStorage
        let checkedIndexes = [];
        try {
            const saved = localStorage.getItem(savedChecksKey);
            if (saved) {
                checkedIndexes = JSON.parse(saved);
            } else {
                // Clear old keys to save space
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sunnahs-checked-')) {
                        localStorage.removeItem(key);
                    }
                });
            }
        } catch (e) {
            console.error('Error loading checks', e);
        }

        items.forEach((item, index) => {
            // Apply checked class if loaded from storage
            if (checkedIndexes.includes(index)) {
                item.classList.add('checked');
            }

            // Click listener
            item.addEventListener('click', () => {
                item.classList.toggle('checked');
                
                // Recalculate checked list
                const currentChecked = [];
                items.forEach((li, idx) => {
                    if (li.classList.contains('checked')) {
                        currentChecked.push(idx);
                    }
                });
                
                try {
                    localStorage.setItem(savedChecksKey, JSON.stringify(currentChecked));
                } catch(e) {
                    console.error('Error saving checks', e);
                }
            });
        });
    }

    // Gallery Lightbox Modal
    const galleryGrid = document.querySelector('.gallery-grid');
    if (galleryGrid) {
        // Create Lightbox Markup
        const lightbox = document.createElement('div');
        lightbox.id = 'gallery-lightbox';
        lightbox.className = 'lightbox-modal';
        lightbox.innerHTML = `
            <span class="lightbox-close">&times;</span>
            <div class="lightbox-content">
                <div class="lightbox-card">
                    <span class="lightbox-img-span"></span>
                    <div class="caption"></div>
                </div>
            </div>
            <a class="lightbox-prev">&#10094;</a>
            <a class="lightbox-next">&#10095;</a>
        `;
        document.body.appendChild(lightbox);

        const items = Array.from(document.querySelectorAll('.gallery-item'));
        const imgSpan = lightbox.querySelector('.lightbox-img-span');
        const caption = lightbox.querySelector('.caption');
        const closeBtn = lightbox.querySelector('.lightbox-close');
        const prevBtn = lightbox.querySelector('.lightbox-prev');
        const nextBtn = lightbox.querySelector('.lightbox-next');
        let currentIndex = 0;

        const openLightbox = (index) => {
            currentIndex = index;
            const item = items[index];
            const spanText = item.querySelector('span').textContent;
            const captionText = item.querySelector('.gallery-caption').textContent;
            
            imgSpan.textContent = spanText;
            caption.textContent = captionText;
            
            lightbox.classList.add('show');
            document.body.style.overflow = 'hidden';
        };

        const closeLightbox = () => {
            lightbox.classList.remove('show');
            document.body.style.overflow = '';
        };

        const showNext = (e) => {
            e.stopPropagation();
            currentIndex = (currentIndex + 1) % items.length;
            openLightbox(currentIndex);
        };

        const showPrev = (e) => {
            e.stopPropagation();
            currentIndex = (currentIndex - 1 + items.length) % items.length;
            openLightbox(currentIndex);
        };

        items.forEach((item, index) => {
            item.addEventListener('click', () => openLightbox(index));
        });

        closeBtn.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', closeLightbox);
        lightbox.querySelector('.lightbox-content').addEventListener('click', (e) => e.stopPropagation());
        nextBtn.addEventListener('click', showNext);
        prevBtn.addEventListener('click', showPrev);

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('show')) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') showNext(e);
            if (e.key === 'ArrowLeft') showPrev(e);
        });
    }

    // Hash Scroll highlight animation flash effect
    document.querySelectorAll('a[href^="#"], a[href*=".html#"]').forEach(anchor => {
        anchor.addEventListener('click', function() {
            const href = this.getAttribute('href');
            const hash = href.includes('#') ? '#' + href.split('#')[1] : null;
            if (hash) {
                const target = document.querySelector(hash);
                if (target) {
                    setTimeout(() => {
                        target.classList.add('flash-target-active');
                        setTimeout(() => {
                            target.classList.remove('flash-target-active');
                        }, 1200);
                    }, 500); // delay to align with scroll finish
                }
            }
        });
    });

    // Scroll Animations Observer
    const scrollObserverOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, scrollObserverOptions);

    // Watch animation elements
    document.querySelectorAll('.fade-in, .fade-in-up, .scale-in, .slide-in-left, .slide-in-right').forEach(el => {
        scrollObserver.observe(el);
    });

    // Stagger layout grids automatically
    document.querySelectorAll('.stagger-children').forEach(container => {
        Array.from(container.children).forEach((child, index) => {
            child.style.transitionDelay = `${index * 120}ms`;
            child.classList.add('fade-in-up');
            scrollObserver.observe(child);
        });
    });

});
