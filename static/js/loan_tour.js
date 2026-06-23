/* ============================================================
   Loan Application Guided Tour (adaptive coachmark)
   Spans: Quick Loan -> Loan Apply -> Payment Method -> Under review
   - Dims the page + spotlights one field at a time
   - User fills the highlighted field directly
   - Auto-advances when the field is completed (smart detection)
   - Skip / Back / Next controls; remembers progress across pages
   English UI only. Style/behaviour additive - never blocks the form.
   ============================================================ */
(function () {
  "use strict";

  var SEEN_KEY = "loanTourSeen_v1";   // set once finished or skipped
  var ACTIVE_KEY = "loanJourney_v1";  // "1" while the guided journey is running

  function lsGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function lsSet(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
  function lsDel(k){ try { localStorage.removeItem(k); } catch(e){} }

  // ---- inject styles once ----
  function injectStyles(){
    if (document.getElementById("loanTourStyles")) return;
    var css = ''
      + '.lt-spot{position:fixed;top:0;left:0;width:0;height:0;border-radius:14px;'
      + 'box-shadow:0 0 0 9999px rgba(17,17,17,.60);transition:top .3s ease,left .3s ease,width .3s ease,height .3s ease;'
      + 'pointer-events:none;z-index:2147482000;}'
      + '.lt-spot.lt-hidden{display:none;}'
      + '.lt-tip{position:fixed;top:50%;left:50%;width:min(300px,88vw);background:#fff;border-radius:18px;'
      + 'padding:15px 16px 13px;box-shadow:0 18px 44px rgba(0,0,0,.32);z-index:2147483000;'
      + "font-family:'Outfit',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;"
      + 'transition:top .3s ease,left .3s ease;}'
      + '.lt-caret{position:absolute;left:24px;width:14px;height:14px;background:#fff;transform:rotate(45deg);}'
      + '.lt-tip.lt-below .lt-caret{top:-7px;}'
      + '.lt-tip.lt-above .lt-caret{bottom:-7px;}'
      + '.lt-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}'
      + '.lt-step{font-size:11px;font-weight:800;color:#FF6B00;letter-spacing:.05em;text-transform:uppercase;}'
      + '.lt-dots{display:flex;gap:5px;}'
      + '.lt-dots i{width:6px;height:6px;border-radius:50%;background:#FFD4A3;display:block;transition:all .2s ease;}'
      + '.lt-dots i.on{background:#FF6B00;width:16px;border-radius:3px;}'
      + '.lt-text{font-size:14px;color:#1a1a1a;line-height:1.5;font-weight:500;margin:0 0 13px;}'
      + '.lt-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;}'
      + '.lt-right{display:flex;align-items:center;gap:8px;}'
      + '.lt-skip{background:none;border:0;color:#9a9a9a;font-size:13px;font-weight:600;cursor:pointer;padding:8px 4px;}'
      + '.lt-back{background:#FFF3E9;border:1px solid #FFD4A3;color:#FF6B00;font-size:13px;font-weight:700;cursor:pointer;border-radius:999px;padding:8px 14px;}'
      + '.lt-next{background:linear-gradient(135deg,#FF6B00,#FF8A33);color:#fff;border:0;border-radius:999px;'
      + 'padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 6px 16px rgba(255,107,0,.32);}'
      + '.lt-next:active,.lt-back:active{transform:scale(.97);}'
      + '.lt-done .lt-text:before{content:"\\2713 ";color:#16a34a;font-weight:800;}'
      + '@media (prefers-reduced-motion: reduce){.lt-spot,.lt-tip{transition:none;}}';
    var st = document.createElement("style");
    st.id = "loanTourStyles";
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ---- build overlay DOM once ----
  var spot, tip, caret, stepEl, dotsWrap, textEl, btnSkip, btnBack, btnNext;
  function buildDom(total){
    spot = document.createElement("div"); spot.className = "lt-spot lt-hidden";
    tip = document.createElement("div"); tip.className = "lt-tip"; tip.style.display = "none";
    tip.setAttribute("role","dialog");
    tip.innerHTML =
      '<span class="lt-caret"></span>'
      + '<div class="lt-head"><span class="lt-step"></span><span class="lt-dots"></span></div>'
      + '<p class="lt-text"></p>'
      + '<div class="lt-actions"><button type="button" class="lt-skip">Skip</button>'
      + '<div class="lt-right"><button type="button" class="lt-back" style="display:none;">Back</button>'
      + '<button type="button" class="lt-next">Next</button></div></div>';
    document.body.appendChild(spot);
    document.body.appendChild(tip);
    caret = tip.querySelector(".lt-caret");
    stepEl = tip.querySelector(".lt-step");
    dotsWrap = tip.querySelector(".lt-dots");
    textEl = tip.querySelector(".lt-text");
    btnSkip = tip.querySelector(".lt-skip");
    btnBack = tip.querySelector(".lt-back");
    btnNext = tip.querySelector(".lt-next");
    for (var d = 0; d < total; d++){
      var dot = document.createElement("i");
      if (d === 0) dot.className = "on";
      dotsWrap.appendChild(dot);
    }
  }

  // ---- helpers ----
  function val(sel){ var e = document.querySelector(sel); return e ? (e.value || "").trim() : ""; }
  function spotOf(el){
    return el.closest && (el.closest(".field-row-wrap") || el.closest(".amount-field-wrap")
      || el.closest(".pm-field-row") || el.closest(".field-row")) || el;
  }

  // ---- the engine ----
  function run(steps, opts){
    opts = opts || {};
    if (!steps.length) return;
    injectStyles();
    buildDom(steps.length);

    var i = 0, poll = null, doneTimer = null;

    function clearTimers(){ if (poll){ clearInterval(poll); poll = null; } if (doneTimer){ clearTimeout(doneTimer); doneTimer = null; } }

    function position(){
      var step = steps[i];
      var t = document.querySelector(step.sel);
      if (!t){ advance(); return; }
      var target = step.spot === false ? t : spotOf(t);
      var r = target.getBoundingClientRect();
      var pad = 8;
      spot.classList.remove("lt-hidden");
      spot.style.top = (r.top - pad) + "px";
      spot.style.left = (r.left - pad) + "px";
      spot.style.width = (r.width + pad * 2) + "px";
      spot.style.height = (r.height + pad * 2) + "px";

      var tipW = tip.offsetWidth, tipH = tip.offsetHeight, gap = 14;
      var below = true, top = r.bottom + pad + gap;
      if (top + tipH > window.innerHeight - 10){ below = false; top = r.top - pad - gap - tipH; }
      if (top < 10) top = 10;
      var left = r.left + r.width / 2 - tipW / 2;
      left = Math.max(10, Math.min(left, window.innerWidth - tipW - 10));
      tip.style.top = top + "px";
      tip.style.left = left + "px";
      tip.classList.toggle("lt-below", below);
      tip.classList.toggle("lt-above", !below);
      var cl = (r.left + r.width / 2) - left - 7;
      cl = Math.max(18, Math.min(cl, tipW - 32));
      caret.style.left = cl + "px";
    }

    function render(){
      clearTimers();
      tip.classList.remove("lt-done");
      var step = steps[i];
      var t = document.querySelector(step.sel);
      if (!t){ advance(); return; }
      tip.style.display = "block";
      textEl.textContent = step.text;
      stepEl.textContent = "Step " + (i + 1) + " of " + steps.length;
      btnBack.style.display = (i === 0) ? "none" : "inline-block";
      btnNext.textContent = (i === steps.length - 1) ? (opts.lastLabel || "Finish") : "Next";
      for (var k = 0; k < dotsWrap.children.length; k++){ dotsWrap.children[k].className = (k === i) ? "on" : ""; }

      try { t.scrollIntoView({ block: "center", behavior: "smooth" }); } catch(e){ t.scrollIntoView(); }
      setTimeout(position, 200);

      // adaptive auto-advance
      if (typeof step.done === "function" && i < steps.length - 1){
        var tag = (t.tagName || "").toUpperCase();
        var isTextInput = (tag === "INPUT" || tag === "TEXTAREA");
        poll = setInterval(function(){
          var done = false;
          try { done = step.done(); } catch(e){ done = false; }
          // for typed fields, only advance once the user moves off the field
          if (done && isTextInput && document.activeElement === t) done = false;
          if (done){
            tip.classList.add("lt-done");
            if (!doneTimer){
              doneTimer = setTimeout(function(){
                clearTimers();
                advance();
              }, step.delay || 600);
            }
          } else {
            tip.classList.remove("lt-done");
            if (doneTimer){ clearTimeout(doneTimer); doneTimer = null; }
          }
        }, 320);
      }
    }

    function advance(){ if (i >= steps.length - 1){ finish(); return; } i++; render(); }
    function back(){ if (i > 0){ i--; render(); } }
    function finish(){
      clearTimers();
      tip.style.display = "none";
      spot.classList.add("lt-hidden");
      if (opts.onFinish) opts.onFinish();
    }
    function skip(){
      clearTimers();
      tip.style.display = "none";
      spot.classList.add("lt-hidden");
      lsSet(SEEN_KEY, "1");
      lsDel(ACTIVE_KEY);
      if (opts.onSkip) opts.onSkip();
    }

    btnNext.addEventListener("click", advance);
    btnBack.addEventListener("click", back);
    btnSkip.addEventListener("click", skip);
    window.addEventListener("resize", function(){ if (tip.style.display !== "none") position(); });
    window.addEventListener("scroll", function(){ if (tip.style.display !== "none") position(); }, { passive: true });

    setTimeout(render, opts.startDelay || 500);
  }

  // ---- page detection + step definitions ----
  function start(){
    var path = location.pathname;
    var qs = new URLSearchParams(location.search);

    // ---------- REGISTER (smart fill) ----------
    if (document.getElementById("id_confirm") && document.getElementById("registerBtn")){
      if (lsGet(SEEN_KEY) === "1" && lsGet(ACTIVE_KEY) !== "1") return;
      var rBtn = document.getElementById("registerBtn");
      if (rBtn) rBtn.addEventListener("click", function(){ lsSet(ACTIVE_KEY, "1"); }); // carry journey into Home
      run([
        { sel: "#id_phone", text: "Enter your mobile number to create your account.",
          done: function(){ return val("#id_phone").length >= 6; } },
        { sel: "#id_password", text: "Create a password (at least 6 characters).",
          done: function(){ return val("#id_password").length >= 6; } },
        { sel: "#id_confirm", text: "Re-type the same password to confirm it.",
          done: function(){ var p = val("#id_password"); return p.length >= 6 && val("#id_confirm") === p; } },
        { sel: "#registerBtn", spot: false, text: "Tap REGISTER to open your account and continue.", done: null }
      ], { lastLabel: "Got it" });
      return;
    }

    // ---------- HOME / DASHBOARD (point to Apply) ----------
    var applyNav = document.querySelector(".nav-item.center-cta");
    if (applyNav){
      if (lsGet(SEEN_KEY) === "1" && lsGet(ACTIVE_KEY) !== "1") return;
      applyNav.addEventListener("click", function(){ lsSet(ACTIVE_KEY, "1"); }); // start loan journey on tap
      run([
        { sel: ".nav-item.center-cta", spot: false, text: "Start here — tap Apply to begin your loan application.", done: null }
      ], { lastLabel: "Got it", onFinish: function(){ lsSet(SEEN_KEY, "1"); } });
      return;
    }

    // ---------- QUICK LOAN ----------
    if (document.getElementById("qAmount") || document.getElementById("statusCard")){
      // "Under review" end-screen (returned after submitting + payment method)
      if (qs.get("done") === "1" && document.getElementById("statusCard")){
        if (lsGet(ACTIVE_KEY) === "1"){
          run([
            { sel: "#statusCard", text: "All done! Your application is now under review. You can track the status right here.", done: null }
          ], { lastLabel: "Got it", onFinish: function(){ lsSet(SEEN_KEY, "1"); lsDel(ACTIVE_KEY); } });
        }
        return;
      }

      var go = document.getElementById("goApply");
      var amt = document.getElementById("qAmount");
      if (!go || !amt || amt.hasAttribute("readonly")) return;     // locked / submitted
      if (lsGet(SEEN_KEY) === "1" && lsGet(ACTIVE_KEY) !== "1") return; // already seen

      lsSet(ACTIVE_KEY, "1");
      go.addEventListener("click", function(){ lsSet(ACTIVE_KEY, "1"); }); // carry into next page

      run([
        { sel: "#qAmount", text: "Enter how much you want to borrow (₱80,000 – ₱5,000,000).",
          done: function(){ var v = Number(val("#qAmount")); return v >= 80000 && v <= 5000000; } },
        { sel: ".term-grid", text: "Choose how many months to repay.",
          done: function(){ return val("#qTerm") !== ""; } },
        { sel: "#goApply", text: "Tap Continue to start your application.", done: null }
      ], { lastLabel: "Got it" });
      return;
    }

    // ---------- LOAN APPLY ----------
    var applyBtn = document.querySelector('button[name="action"][value="apply_loan"]');
    if (applyBtn && document.getElementById("fullName")){
      if (lsGet(ACTIVE_KEY) !== "1") return; // only during the guided journey
      applyBtn.addEventListener("click", function(){ lsSet(ACTIVE_KEY, "1"); });

      run([
        { sel: "#fullName", text: "Type your full name.",
          done: function(){ return val("#fullName").length >= 2; } },
        { sel: 'input[name="age"]', text: "Enter your age.",
          done: function(){ var v = Number(val('input[name="age"]')); return v >= 18 && v <= 90; } },
        { sel: "#currentLiving", text: "Where do you currently live?",
          done: function(){ return val("#currentLiving").length >= 2; } },
        { sel: 'textarea[name="hometown"]', text: "Enter your hometown.",
          done: function(){ return val('textarea[name="hometown"]').length >= 2; } },
        { sel: "#incomeInput", text: "Your monthly income (optional) — fill it or tap Next.",
          done: function(){ return val("#incomeInput").length >= 1; } },
        { sel: "#expensesInput", text: "Your monthly expenses (numbers only).",
          done: function(){ return val("#expensesInput").length >= 1; } },
        { sel: "#identityName", text: "The full name printed on your ID.",
          done: function(){ return val("#identityName").length >= 2; } },
        { sel: "#identityNumber", text: "Your ID number.",
          done: function(){ return val("#identityNumber").length >= 1; } },
        { sel: "#purposeField", text: "Pick why you need the loan (optional) — choose one or tap Next.",
          done: function(){ return !!document.querySelector('input[name="loan_purposes"]:checked'); }, delay: 500 },
        { sel: "#boxFront", spot: false, text: "Tap to upload the FRONT of your ID.",
          done: function(){ var b = document.getElementById("boxFront"); return !!b && b.classList.contains("has-img"); }, delay: 500 },
        { sel: "#boxBack", spot: false, text: "Now upload the BACK of your ID.",
          done: function(){ var b = document.getElementById("boxBack"); return !!b && b.classList.contains("has-img"); }, delay: 500 },
        { sel: "#boxSelfie", spot: false, text: "Upload a selfie while holding your ID.",
          done: function(){ var b = document.getElementById("boxSelfie"); return !!b && b.classList.contains("has-img"); }, delay: 500 },
        { sel: "#sigBox", spot: false, text: "Draw your signature inside the box.",
          done: function(){ return val("#signatureData").length > 0; }, delay: 500 },
        { sel: 'button[name="action"][value="apply_loan"]', spot: false, text: "Review your loan summary, then tap Confirm Apply to submit.", done: null }
      ], { lastLabel: "Got it" });
      return;
    }

    // ---------- PAYMENT METHOD ----------
    var pmRows = document.querySelectorAll(".pm-field-row");
    var pmSave = document.querySelector(".nav-btn");
    if (pmRows.length >= 2 && pmSave){
      if (lsGet(ACTIVE_KEY) !== "1") return;
      pmSave.addEventListener("click", function(){ lsSet(ACTIVE_KEY, "1"); });

      var nameInput = pmRows[0].querySelector("input");
      var numInput = pmRows[1].querySelector("input");
      if (nameInput && !nameInput.id) nameInput.id = "ltPmName";
      if (numInput && !numInput.id) numInput.id = "ltPmNum";

      run([
        { sel: "#ltPmName", text: "Enter your bank/wallet account name.",
          done: function(){ return val("#ltPmName").length >= 2; } },
        { sel: "#ltPmNum", text: "Enter your account number.",
          done: function(){ return val("#ltPmNum").length >= 1; } },
        { sel: ".nav-btn", spot: false, text: "Tap Save to finish your application.", done: null }
      ], { lastLabel: "Got it" });
      return;
    }
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){ setTimeout(start, 400); });
  } else {
    setTimeout(start, 400);
  }
})();
