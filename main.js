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
            { text: 'Admin: Questions', href: 'admin_questions.html' },
            { text: 'Admin: Users', href: 'admin_users.html' },
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
        const defaultTimings = {
            Fajr: "04:30",
            Dhuhr: "13:20",
            Asr: "17:15",
            Maghrib: "20:45",
            Isha: "22:15"
        };

        const updatePrayerUI = (timings) => {
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
        };

        try {
            // You can change 'method=2' (ISNA) to other calculation methods if needed
            const response = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Milan&country=Italy&method=2');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();

            if (result && result.data && result.data.timings) {
                updatePrayerUI(result.data.timings);
            } else {
                throw new Error("Invalid API response format");
            }
        } catch (error) {
            console.warn('Error fetching live prayer times, using Milan defaults:', error);
            updatePrayerUI(defaultTimings);
        }
    }

    fetchPrayerTimes();

    // Form submission
    const form = document.querySelector('.contact-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            const originalText = btn.textContent;
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const year = document.getElementById('year').value;

            btn.disabled = true;
            btn.textContent = 'Subscribing...';

            try {
                const response = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, year })
                });
                const result = await response.json();
                if (result.success) {
                    btn.textContent = result.message || 'Subscribed!';
                    btn.style.backgroundColor = '#047857';
                    btn.style.color = 'white';
                    form.reset();
                } else {
                    alert(result.message || 'Error subscribing.');
                    btn.textContent = originalText;
                }
            } catch (err) {
                console.error(err);
                alert('Connection error.');
                btn.textContent = originalText;
            } finally {
                btn.disabled = false;
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.backgroundColor = '';
                    btn.style.color = '';
                }, 3000);
            }
        });
    }

    // Click-to-copy IBAN functionality
    const ibanCopyBtn = document.getElementById('iban-copy');
    if (ibanCopyBtn) {
        ibanCopyBtn.addEventListener('click', () => {
            // Get text content, excluding the SVG icon/children text
            const ibanText = ibanCopyBtn.childNodes[0].textContent.trim();
            navigator.clipboard.writeText(ibanText).then(() => {
                ibanCopyBtn.classList.add('copied');
                setTimeout(() => {
                    ibanCopyBtn.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy IBAN: ', err);
            });
        });
    }
});
