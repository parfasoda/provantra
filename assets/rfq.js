        // 4. MOBILE MENU & RFQ MODAL
        const menuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (menuBtn && mobileMenu) {
            menuBtn.addEventListener('click', () => {
                const isHidden = mobileMenu.classList.toggle('hidden');
                menuBtn.setAttribute('aria-expanded', String(!isHidden));
            });
            document.querySelectorAll('.mobile-link').forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenu.classList.add('hidden');
                    menuBtn.setAttribute('aria-expanded', 'false');
                });
            });
        }

        function openRfqModal(serviceName = '') {
            const modal = document.getElementById('rfq-modal');
            const serviceField = document.getElementById('rfq-service-field');
            if (serviceName && serviceField) {
                serviceField.value = serviceName;
            }
            modal.classList.remove('invisible');
            modal.classList.add('opacity-100', 'open');
            document.body.style.overflow = 'hidden';
            if (mobileMenu) mobileMenu.classList.add('hidden');
        }

        function closeRfqModal() {
            const modal = document.getElementById('rfq-modal');
            modal.classList.remove('opacity-100', 'open');
            document.body.style.overflow = '';
            
            setTimeout(() => {
                modal.classList.add('invisible');
                document.getElementById('rfq-form').classList.remove('hidden');
                document.getElementById('rfq-success').classList.add('hidden');
                const eb = document.getElementById('rfq-error'); if (eb) eb.classList.add('hidden');
                // согласие даётся заново при каждой отправке данных
                const consent = document.getElementById('rfq-consent');
                if (consent) consent.checked = false;
            }, 350);
        }

        const RFQ_API_URL = 'https://provantra.parfenovd441.workers.dev';
        const RFQ_ERROR_TEXT = 'Не удалось отправить заявку. Пожалуйста, попробуйте ещё раз или свяжитесь с нами через WhatsApp';
        let rfqSending = false;

        function setRfqLoading(on) {
            const btn = document.getElementById('rfq-submit');
            const label = document.getElementById('rfq-submit-label');
            if (!btn || !label) return;
            if (on) {
                if (!btn.dataset.label) btn.dataset.label = label.textContent;
                btn.disabled = true;
                btn.classList.add('is-loading');
                btn.setAttribute('aria-busy', 'true');
                label.textContent = 'Отправляем заявку...';
                btn.insertAdjacentHTML('afterbegin', '<span class="rfq-spinner" id="rfq-spinner"></span>');
            } else {
                btn.disabled = false;
                btn.classList.remove('is-loading');
                btn.removeAttribute('aria-busy');
                label.textContent = btn.dataset.label || label.textContent;
                const sp = document.getElementById('rfq-spinner');
                if (sp) sp.remove();
            }
        }

        function showRfqError(msg) {
            const box = document.getElementById('rfq-error');
            if (!box) return;
            box.textContent = msg;
            box.classList.remove('hidden');
        }

        async function handleRfqSubmit(e) {
            e.preventDefault();
            if (rfqSending) return; // защита от повторной отправки
            const val = (id) => {
                const el = document.getElementById(id);
                return el ? el.value.trim() : '';
            };

            // Поле формы «Компания / Ваше имя» → company и name
            const who = val('rfq-name');
            let company = who, contact = who;
            if (who.indexOf('/') !== -1) {
                const parts = who.split('/');
                company = parts[0].trim() || who;
                contact = parts.slice(1).join('/').trim() || who;
            }

            const payload = {
                company: company,
                name: contact,
                phone: val('rfq-phone'),
                email: val('rfq-email'),
                product: val('rfq-service-field'),
                quantity: '', // отдельного поля в форме нет — объём клиент указывает в комментарии
                comment: val('rfq-comment')
            };

            const errBox = document.getElementById('rfq-error');
            if (errBox) errBox.classList.add('hidden');
            rfqSending = true;
            setRfqLoading(true);

            let ok = false;
            try {
                const ctrl = new AbortController();
                const timer = setTimeout(() => ctrl.abort(), 20000);
                const res = await fetch(RFQ_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: ctrl.signal
                });
                clearTimeout(timer);
                let data = null;
                try { data = await res.json(); } catch (err) {}
                ok = !!(res.ok && data && data.success === true);
                if (!ok) console.error('[RFQ] Ответ Worker:', res.status, data);
            } catch (err) {
                console.error('[RFQ] Ошибка запроса (часто это CORS или нет сети):', err);
                ok = false;
            }

            rfqSending = false;
            setRfqLoading(false);

            if (ok) {
                const f = document.getElementById('rfq-form');
                if (f) f.reset();
                closeRfqModal();
                openRfqSuccess();
            } else {
                showRfqError(RFQ_ERROR_TEXT); // данные в форме сохраняются
            }
        }

        function openRfqSuccess() {
            const m = document.getElementById('rfq-success-modal');
            if (!m) return;
            m.classList.add('open');
            m.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            if (window.lucide) lucide.createIcons();
            setTimeout(() => { const b = document.getElementById('rfq-success-btn'); if (b) b.focus({ preventScroll: true }); }, 100);
        }

        function closeRfqSuccess() {
            const m = document.getElementById('rfq-success-modal');
            if (!m) return;
            m.classList.remove('open');
            m.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        (function () {
            const m = document.getElementById('rfq-success-modal');
            if (!m) return;
            m.addEventListener('click', (e) => { if (e.target === m) closeRfqSuccess(); });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && m.classList.contains('open')) closeRfqSuccess();
            });
        })();

        // Закрытие модального окна: клик по тёмному фону и клавиша Esc
        (function () {
            const modal = document.getElementById('rfq-modal');
            if (!modal) return;
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeRfqModal();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape') return;
                const pm = document.getElementById('privacy-modal');
                if (pm && pm.classList.contains('open')) { closePrivacyModal(); return; }
                if (modal.classList.contains('open')) closeRfqModal();
            });
        })();

        // 5. ПОЛИТИКА ОБРАБОТКИ ПЕРСОНАЛЬНЫХ ДАННЫХ (окно, ссылка #privacy)
        const privacyModal = document.getElementById('privacy-modal');
        let privacyLastFocus = null;

        function openPrivacyModal(e) {
            if (e && e.preventDefault) e.preventDefault();
            if (!privacyModal) return;
            privacyLastFocus = document.activeElement;
            privacyModal.classList.add('open');
            privacyModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            if (mobileMenu) mobileMenu.classList.add('hidden');
            const body = document.getElementById('privacy-body');
            if (body) { body.scrollTop = 0; body.focus({ preventScroll: true }); }
            try { history.replaceState(null, '', '#privacy'); } catch (err) {}
        }

        function closePrivacyModal() {
            if (!privacyModal || !privacyModal.classList.contains('open')) return;
            privacyModal.classList.remove('open');
            privacyModal.setAttribute('aria-hidden', 'true');
            // если форма заявки открыта под политикой — оставляем блокировку прокрутки
            const rfq = document.getElementById('rfq-modal');
            if (!rfq || !rfq.classList.contains('open')) document.body.style.overflow = '';
            try {
                if (location.hash === '#privacy') history.replaceState(null, '', location.pathname + location.search);
            } catch (err) {}
            if (privacyLastFocus && privacyLastFocus.focus) privacyLastFocus.focus({ preventScroll: true });
        }

        if (privacyModal) {
            // клик по тёмному фону закрывает только политику
            privacyModal.addEventListener('click', (e) => {
                if (e.target === privacyModal) closePrivacyModal();
            });
        }
        // прямая ссылка на политику: сайт.kz/#privacy
        window.addEventListener('hashchange', () => {
            if (location.hash === '#privacy') openPrivacyModal(); else closePrivacyModal();
        });
        document.addEventListener('DOMContentLoaded', () => {
            if (location.hash === '#privacy') openPrivacyModal();
        });
