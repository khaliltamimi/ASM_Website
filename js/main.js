document.addEventListener('DOMContentLoaded', () => {
    
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
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
            navbar.style.padding = '0';
        } else {
            navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
        }
    });

    // Set Current Date in Prayer Times
    const dateDisplay = document.getElementById('current-date');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);

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

                document.getElementById('fajr-time').textContent = formatTime(timings.Fajr);
                document.getElementById('dhuhr-time').textContent = formatTime(timings.Dhuhr);
                document.getElementById('asr-time').textContent = formatTime(timings.Asr);
                document.getElementById('maghrib-time').textContent = formatTime(timings.Maghrib);
                document.getElementById('isha-time').textContent = formatTime(timings.Isha);

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
            document.getElementById('fajr-time').textContent = '--:--';
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
});
