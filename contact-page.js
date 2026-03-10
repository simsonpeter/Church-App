(function () {
            var form = document.getElementById("prayer-request-form");
            var nameInput = document.getElementById("prayer-name");
            var messageInput = document.getElementById("prayer-message");
            var note = document.getElementById("prayer-form-note");

            function T(key, fallback) {
                if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
                    return window.NjcI18n.t(key, fallback);
                }
                return fallback || key;
            }

            form.addEventListener("submit", function (event) {
                event.preventDefault();
                var nameValue = (nameInput.value || "").trim();
                var messageValue = (messageInput.value || "").trim();

                if (!messageValue) {
                    note.hidden = false;
                    note.textContent = T("contact.prayerNeedMessage", "Please enter your prayer request.");
                    return;
                }

                var subject = "Prayer Request" + (nameValue ? " - " + nameValue : "");
                var body = (nameValue ? "Name: " + nameValue + "\n\n" : "") + "Prayer request:\n" + messageValue;
                var mailtoUrl = "mailto:simsonpeter@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
                window.location.href = mailtoUrl;
                note.hidden = false;
                note.textContent = T("contact.prayerMailOpened", "Your email app has been opened.");
            });

            document.addEventListener("njc:langchange", function () {
                if (!note.hidden) {
                    if ((messageInput.value || "").trim()) {
                        note.textContent = T("contact.prayerMailOpened", "Your email app has been opened.");
                    } else {
                        note.textContent = T("contact.prayerNeedMessage", "Please enter your prayer request.");
                    }
                }
            });
        })();
