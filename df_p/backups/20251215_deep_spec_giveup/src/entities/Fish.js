class Fish {
  constructor({ parent, def, direction = 'left', overrideSprite } = {}) {
    this.parent = parent;
    this.def = def; // { id, name_ja, rank, sprite, movement }
    this.direction = direction; // 'left' or 'right'
    this.overrideSprite = overrideSprite;
    this.el = null;
    this.t = 0; // seconds from spawn
    this.x = 0;
    this.y = 0;
    this.vx = 0; // px/s
    this.vy = 0; // px/s
    this._baseY = 0;
    this._phase = Math.random() * Math.PI * 2;
    this.worldSpeedMul = 1;
    // 逃走演出用ステート
    this._fleeing = false;
    this._fleeTime = 0;
    this._fleeDur = 0; // seconds
    this._fleeVX = 0; // px/s
    this._fleeVY = 0; // px/s
    // 当たり判定の有効/無効
    this._hitDisabled = false;
    // 追加挙動（ベースに重ねる）
    this._addonPatrolX = false;
    this._patrolEdgeBounce = true;
    this._rushToBaitX = false;
    this._rushSpeed = 0;
    this._rushDur = 0; // seconds
    this._rushElapsed = 0;
    this._rushTargetX = null; // scene側でスポーン時に設定
    this._rushTargetY = null; // 斜め突進用にYも保持
    this._rushHoming = false; // 毎フレーム餌へホーミングするか
    this._rushUx = null; // 非ホーミング時の固定方向（単位ベクトル）
    this._rushUy = null;
    this._rushUntilOffscreen = false;
    // 画面X外への移動許可とデスポーン余白
    this._allowOffscreenX = false;
    this._despawnOffX = 100; // px
    // 餌から離れる（X方向）
    this._avoidFromBaitX = false;
    this._avoidSpeed = 0;
    this._avoidDur = 0; // seconds
    this._avoidElapsed = this._avoidDur; // 初期は非アクティブ（範囲内で再始動）
    this._avoidTargetX = null;
    this._avoidRange = 100; // px 以内で回避トリガ
    // サンプリング追尾（一定間隔でベクトル更新して泳ぎ続ける）
    this._sampleSeekEnabled = false;
    this._seekInterval = 0.6; // sec
    this._seekTimer = 0;
    this._seekSpeed = 0;
    this._seekUx = null; this._seekUy = null;
    this._seekTargetX = null; this._seekTargetY = null;
    // ランダムダート（シュッ→戻る）
    this._dartEnabled = false;
    this._dartSpeed = 0;
    this._dartDur = 0; // sec
    this._dartReturnEnabled = false;
    this._dartReturnFrac = 0.4; // 返しは前進速度の割合
    this._dartReturnDur = 0; // sec
    this._dartIntervalMin = 0.3; this._dartIntervalMax = 0.7; // sec
    this._dartState = 'idle';
    this._dartTimer = 0;
    this._dartUx = null; this._dartUy = null;
    // レンジ内チェイス（餌）
    this._chaseInRange = false;
    this._chaseRange = 0; // px
    this._chaseSpeed = 0; // px/s
    this._chaseTargetX = null; this._chaseTargetY = null;
    // 円/楕円運動（ベース上にオフセット加算）
    this._circleEnabled = false;
    this._circleRadius = 0;
    this._circleOmega = 0;
    this._ellipseXScale = 1; this._ellipseYScale = 1;
    this._circleTheta = 0; this._circlePrevOx = 0; this._circlePrevOy = 0;
    // 横方向の大波
    this._waveXEnabled = false;
    this._waveXAmplitude = 0; this._waveXOmega = 0;
    this._waveXPrevOx = 0;
    // 第二近接魚への追尾
    this._seekSecondNearestFish = false;
    this._seekOtherSpeed = 0;
    this._seekOtherTargetX = null; this._seekOtherTargetY = null;
    this._seekAttachRadius = 0;
    // ランダム直進（スポーン時に方向確定）
    this._randStraightEnabled = false;
    this._randStraightSpeed = 0;
    this._randUx = null; this._randUy = null;
    // 点滅テレポート
    this._blinkTeleport = false;
    this._blinkCount = 3; // 何回点滅（ON/OFF）
    this._blinkInterval = 0.18; // sec
    this._blinkCooldown = 1.2; // sec
    this._blinkState = 'idle';
    this._blinkTimer = 0;
    this._blinkTogglesLeft = 0;
    // ダブル軌道（惑星+衛星）
    this._doubleOrbit = false;
    this._orbitR1 = 0; this._orbitW1 = 0; this._orbitTh1 = 0; this._orbitPrevOx1 = 0; this._orbitPrevOy1 = 0;
    this._orbitR2 = 0; this._orbitW2 = 0; this._orbitTh2 = 0; this._orbitPrevOx2 = 0; this._orbitPrevOy2 = 0;
    // パルス拡縮（サイズが周期的に変化）
    this._pulsateEnabled = false;
    this._pulsateAmp = 0; // スケール倍率の振幅（例0.3→±30%）
    this._pulsateOmega = 0; // 角速度
    this._pulsatePhase = Math.random() * Math.PI * 2;
    this._baseWidthPx = 0; // mount時に設定
    // 基礎不透明度
    this._baseOpacity = null;
    // 魚同士の反射フラグ（Scene側処理用）
    this._reflectOnFishHit = false;
    this._knockbackOnContact = false;
    // 成長（徐々に大きく）
    this._growEnabled = false;
    this._growFromScale = 1;
    this._growToScale = 1;
    this._growDur = 0; // seconds
    this._growTime = 0;
    this._currentScale = 1;
    this._shrinking = false;
    this._shrinkTime = 0;
    this._shrinkDur = 0;
    this._shrinkToFrac = 0.2;
    // 可視化用ドット（現状は無効化）
    this._waveDots = null;
    this._waveDotsCount = 21;
    this._waveStepX = 6;
    this._waveDotSize = 3;
    this._waveVisEnabled = false;
    // ランダム遊泳（セキトリイワシ用）
    this._randSwimEnabled = false;
    this._randSwimSpeed = 0;
    this._randSwimUx = null; this._randSwimUy = null;
    this._randSwimSwitchSec = 2.0;
    this._randSwimTimer = 0;
    // 糸を切る挙動
    this._cutRopeOnTouch = false;
    // 親個体フラグと子供生成
    this._isParent = false;
    this._spawnChildren = false;
    this._childType = null;
    this._childrenSpawned = false;
    // 上昇円運動
    this._circleUpward = false;
    this._upwardSpeed = 0;
    // 親の定期生成
    this._spawnInterval = 0;
    this._spawnTimer = 0;
    this._lastSpawnTime = 0;
    // 渦巻き運動
    this._spiralOutward = false;
    this._spiralRadius = 0;
    this._spiralOmega = 0;
    this._spiralExpandSpeed = 0;
    this._spiralTheta = 0;
    this._spiralStartX = 0;
    this._spiralStartY = 0;
    this._spiralCurrentRadius = 0;
    // 捕食プロパティ
    this._eatFishOnContact = false;
    this._eatRange = 0;
    this._wanderEnabled = false;
    this._wanderTimer = 0;
    this._wanderInterval = 0.9; // sec
    this._wanderSpeed = 70; // px/s
    this._wanderUx = 1; this._wanderUy = 0;
    // 多角形移動（キチジ用）
    this._polyMoveEnabled = false;
    this._polyCx = 0; this._polyCy = 0;
    this._polyR = 80; // 半径
    this._polySpeed = 80; // px/s（辺上の移動速度）
    this._polySides = 5; // 五角形
    this._polyIndex = 0;
    this._polyPts = null;
    // スケール振動（最小〜最大）
    this._scaleOscillation = false;
    this._scaleMin = 1; this._scaleMax = 1;
    this._scaleOmega = 0;
    // 回転
    this._rotationEnabled = false;
    this._rotationSpeed = 0; // deg/s
    this._rotationAngle = 0;
  }

  startShrinkAndFadeOut(durationMs = 600, toFrac = 0.2) {
    try {
      this._shrinking = true;
      this._shrinkTime = 0;
      this._shrinkDur = Math.max(0.1, (durationMs || 600) / 1000);
      this._shrinkToFrac = Math.max(0, Math.min(1, toFrac || 0.2));
      this._hitDisabled = true;
      if (this.el) {
        this.el.style.opacity = '1';
      }
    } catch (_) {
      this._shrinking = true; this._shrinkTime = 0; this._shrinkDur = Math.max(0.1, (durationMs || 600) / 1000); this._shrinkToFrac = Math.max(0, Math.min(1, toFrac || 0.2)); this._hitDisabled = true;
    }
  }

  mount() {
    if (!this.parent || this.el) return;
    Fish._ensureHitGuide?.();
    const img = document.createElement('img');
    img.className = `fish-sprite fish--${this.def?.id || 'unk'}`;
    img.decoding = 'async';
    try { img.loading = 'eager'; } catch (_) { }
    // 定義のスプライト（PNG想定）を使い、失敗したら 別名/パス→共通シルエットへフォールバック
    const origSrc = this.overrideSprite || (this.def?.sprite || 'assets/fish.png');
    img.onerror = () => {
      try {
        const triedFishes = img.dataset._triedFishes === '1';
        const orig = img.getAttribute('src') || '';
        // 1段階目: assets/fish/xxx → assets/fishes/xxx を試す
        if (!triedFishes && orig.includes('assets/fish/')) {
          img.dataset._triedFishes = '1';
          const base = orig.split('/').pop();
          img.src = `assets/fishes/${base}`;
          return;
        }
        // 2段階目: 既知の別名マッピング（例: maiwashi→iwashi, madai→tai など）
        const id = this?.def?.id || '';
        const altMap = {
          maaji: 'aji',
          maiwashi: 'iwashi',
          masaba: 'saba',
          madai: 'tai',
          shiirakansu: 'si-rakansu',
          atorantikkusaamon: 'atoranteikkusaamon'
        };

        const alt = altMap[id];
        const triedAlt = img.dataset._triedAlt === '1';
        if (!triedAlt && alt) {
          img.dataset._triedAlt = '1';
          img.src = `assets/fishes/${alt}.png`;
          return;
        }
        // 3段階目: 共通シルエットへ
        if (img.dataset._fallbackApplied === '1') return;
        img.dataset._fallbackApplied = '1';
        img.src = 'assets/fish.png';
      } catch (_) { }
    };
    // 指定されたパスをそのまま使用（通常は .png）。存在しない場合は onerror でフォールバック。
    img.src = origSrc;
    img.alt = this.def?.name_ja || this.def?.id || 'fish';
    img.style.position = 'absolute';
    img.style.left = '0px';
    img.style.top = '0px';
    img.style.transform = 'translate(-50%, -50%)';
    img.style.pointerEvents = 'none';
    img.style.zIndex = '3';
    // sizeScale（基準幅を1/2の40pxに）
    const scale = this.def?.movement?.sizeScale || 1;
    this._currentScale = scale;
    const bw = Math.round(40 * scale);
    img.style.width = `calc(${bw}px)`; // 基準40px（半分）
    this._baseWidthPx = bw;
    img.style.height = 'auto';
    this.parent.appendChild(img);
    this.el = img;

    // STEALTH GLOW EFFECT (Hotaruika)
    if (this.def?.stealthRadius > 0) {
      const g = document.createElement('div');
      g.className = 'stealth-glow';
      const r = this.def.stealthRadius;
      g.style.position = 'absolute';
      g.style.width = `${r * 2}px`;
      g.style.height = `${r * 2}px`;
      g.style.left = '0px';
      g.style.top = '0px';
      g.style.transform = 'translate(-50%, -50%)';
      g.style.borderRadius = '50%';
      // Faint glow effect (Blue-ish for Hotaruika)
      g.style.background = 'radial-gradient(circle, rgba(130, 220, 255, 0.15) 0%, rgba(130, 220, 255, 0.05) 60%, transparent 70%)';
      g.style.boxShadow = '0 0 20px rgba(100, 200, 255, 0.2), inset 0 0 20px rgba(100, 200, 255, 0.1)';
      g.style.pointerEvents = 'none';
      g.style.zIndex = '2'; // Behind fish (3) but above bg
      g.style.mixBlendMode = 'screen'; // Nice glowing blend
      this.parent.appendChild(g);
      this._stealthEl = g;
    }
  }

  unmount() {
    if (this._waveDots) { try { this._waveDots.forEach(el => el.remove()); } catch (_) { } this._waveDots = null; this._waveVisEnabled = false; }
    if (this._stealthEl) { this._stealthEl.remove(); this._stealthEl = null; }
    if (this.el) { this.el.remove(); this.el = null; }
  }

  setPosition(x, y) {
    this.x = x; this.y = y;
    if (this._stealthEl) {
      this._stealthEl.style.left = `${x}px`;
      this._stealthEl.style.top = `${y}px`;
      // Optional: pulsate effect here or via CSS?
      // Leaving simple for now
    }
    if (this.el) {
      this.el.style.left = `${x}px`;
      this.el.style.top = `${y}px`;
      const flip = (this.direction === 'left') ? 1 : -1;
      // Scale X/Y support (default Y=1)
      const sx = (this._fixedScaleX || 1) * flip;
      const sy = (this._fixedScaleY || 1);

      let tf = `translate(-50%, -50%) scale(${sx}, ${sy})`;

      // Rotation support
      let rot = 0;
      if (this._fixedRotation != null) {
        rot = Number(this._fixedRotation);
      } else if (this._rotationEnabled) {
        rot = this._rotationAngle;
      }

      if (rot) {
        tf += ` rotate(${rot}deg)`;
      }
      this.el.style.transform = tf;
    }
  }

  applyMovementPreset() {
    const mv = this.def?.movement || {};
    const speed = mv.speed || 40; // px/s
    const amp = mv.amplitude || 0;
    const freq = mv.frequency || 0; // Hz
    const dirSign = (this.direction === 'left') ? -1 : 1;
    this.vx = dirSign * speed;
    this.vy = 0;
    this._baseY = this.y;
    this._amp = amp;
    this._omega = Math.PI * 2 * freq;
    this._pattern = mv.pattern || 'straight';
    // オーバーレイ挙動（riseに重ねる）
    this._addonPatrolX = !!mv.patrolX;
    this._patrolEdgeBounce = (mv.edgeBounce !== false);
    this._rushToBaitX = !!mv.rushToBaitX;
    this._rushSpeed = Math.max(0, mv.rushSpeed || 0);
    this._rushDur = Math.max(0, (mv.rushDurationMs || 0) / 1000);
    this._rushElapsed = 0;
    this._rushHoming = !!mv.rushHoming;
    this._rushUx = null; this._rushUy = null;
    this._rushUntilOffscreen = !!mv.rushUntilOffscreen;
    // 画面X外への移動許可とデスポーン余白
    this._allowOffscreenX = !!mv.allowOffscreenX;
    this._despawnOffX = Math.max(0, mv.despawnOffX || 100);
    // 餌から離れる
    this._avoidFromBaitX = !!mv.avoidFromBaitX;
    this._avoidSpeed = Math.max(0, mv.avoidSpeed || 0);
    this._avoidDur = Math.max(0, (mv.avoidDurationMs || 0) / 1000);
    this._avoidElapsed = this._avoidDur; // 初期は非アクティブ（範囲内で再始動）
    this._avoidRange = Math.max(0, mv.avoidRangePx || 100);
    // サンプリング追尾
    this._sampleSeekEnabled = !!mv.sampleSeekBait;
    this._seekInterval = Math.max(0.05, (mv.seekIntervalMs || 600) / 1000);
    this._seekTimer = Math.random() * this._seekInterval;
    this._seekSpeed = Math.max(0, mv.seekSpeed || 0);
    this._seekUx = null; this._seekUy = null;
    // ダート
    this._dartEnabled = !!mv.dartEnabled;
    this._dartSpeed = Math.max(0, mv.dartSpeed || 0);
    this._dartDur = Math.max(0, (mv.dartDurationMs || 0) / 1000);
    this._dartReturnEnabled = !!mv.dartReturn;
    this._dartReturnFrac = Math.max(0, Math.min(1, (mv.dartReturnFrac ?? 0.4)));
    this._dartReturnDur = Math.max(0, (mv.dartReturnMs || 0) / 1000);
    this._dartIntervalMin = Math.max(0.01, (mv.dartIntervalMinMs || 300) / 1000);
    this._dartIntervalMax = Math.max(this._dartIntervalMin, (mv.dartIntervalMaxMs || 700) / 1000);
    this._dartState = 'idle';
    this._dartTimer = this._dartIntervalMin + Math.random() * (this._dartIntervalMax - this._dartIntervalMin);
    this._dartUx = null; this._dartUy = null;
    // チェイス
    this._chaseInRange = !!mv.chaseBaitInRange;
    this._chaseRange = Math.max(0, mv.chaseRangePx || 0);
    this._chaseSpeed = Math.max(0, mv.chaseSpeed || 0);
    // 円/楕円
    this._circleEnabled = !!(mv.circleMove || mv.circleEnabled);
    this._circleRadius = Math.max(0, mv.circleRadius || 0);
    this._circleOmega = mv.circleOmega || 0;
    this._ellipseXScale = mv.ellipseXScale || 1;
    this._ellipseYScale = mv.ellipseYScale || 1;
    this._circleTheta = this._phase || 0;
    this._circlePrevOx = 0; this._circlePrevOy = 0;
    // 横波
    this._waveXEnabled = !!mv.waveX;
    this._waveXAmplitude = Math.max(0, mv.waveXAmplitude || 0);
    this._waveXOmega = mv.waveXOmega || ((mv.waveXFrequencyHz ? (Math.PI * 2 * mv.waveXFrequencyHz) : 0));
    this._waveXPrevOx = 0;
    // 第二近接追尾
    this._seekSecondNearestFish = !!mv.seekSecondNearestFish;
    // 近接追尾 (New)
    this._seekNearestFish = !!mv.seekNearestFish;
    this._seekOtherSpeed = Math.max(0, mv.seekOtherSpeed || 0);
    this._seekAttachRadius = Math.max(0, mv.seekAttachRadiusPx || 0);
    // ランダム直進
    this._randStraightEnabled = !!mv.randomStraight;
    this._randStraightSpeed = Math.max(0, mv.randomStraightSpeed || mv.randStraightSpeed || 0);
    if (this._randStraightEnabled) {
      const ang = Math.random() * Math.PI * 2;
      this._randUx = Math.cos(ang);
      this._randUy = Math.sin(ang);
      const ln = Math.hypot(this._randUx, this._randUy) || 1;
      this._randUx /= ln; this._randUy /= ln;
    } else {
      this._randUx = null; this._randUy = null;
    }
    // 点滅テレポート
    this._blinkTeleport = !!mv.blinkTeleport;
    this._blinkCount = Math.max(1, mv.blinkCount || 3);
    this._blinkInterval = Math.max(0.05, (mv.blinkIntervalMs || 180) / 1000);
    this._blinkCooldown = Math.max(0, (mv.blinkCooldownMs || 1200) / 1000);
    this._blinkState = 'idle';
    this._blinkTimer = this._blinkCooldown * Math.random();
    this._blinkTogglesLeft = 0;
    // ダブル軌道
    this._doubleOrbit = !!mv.doubleOrbit;
    this._orbitR1 = Math.max(0, mv.orbitR1 || 0);
    this._orbitW1 = mv.orbitW1 || 0;
    this._orbitTh1 = this._phase || 0;
    this._orbitPrevOx1 = 0; this._orbitPrevOy1 = 0;
    this._orbitR2 = Math.max(0, mv.orbitR2 || 0);
    this._orbitW2 = mv.orbitW2 || 0;
    this._orbitTh2 = this._phase + Math.random() * 0.5; // 少しずらす
    this._orbitPrevOx2 = 0; this._orbitPrevOy2 = 0;
    // パルス拡縮
    this._pulsateEnabled = !!mv.pulsate;
    this._pulsateAmp = Math.max(0, Math.min(1.5, mv.pulsateAmp || 0));
    this._pulsateOmega = mv.pulsateOmega || ((mv.pulsateHz ? (Math.PI * 2 * mv.pulsateHz) : 0));
    this._pulsatePhase = this._phase || 0;
    // 基礎不透明度
    // 基礎不透明度
    this._baseOpacity = (typeof mv.opacity === 'number') ? Math.max(0, Math.min(1, mv.opacity)) : 1;
    // Opacity Blink
    this._blinkOpacityEnabled = !!mv.blinkOpacity;
    this._blinkOpacityAmp = mv.blinkOpacityAmp || 0.5;
    this._blinkOpacityOmega = mv.blinkOpacityOmega || ((mv.blinkOpacityHz ? (Math.PI * 2 * mv.blinkOpacityHz) : 0));
    this._blinkOpacityPhase = this._phase || 0;
    try { if (this.el && this._baseOpacity != null && !this._fleeing) this.el.style.opacity = String(this._baseOpacity); } catch (_) { }
    // 反射フラグ（Scene側で参照）
    this._reflectOnFishHit = !!mv.reflectOnFishHit;
    // 成長
    this._growEnabled = (mv.growToScale != null) && (mv.growDurationMs > 0);
    this._growFromScale = this._currentScale || (mv.sizeScale || 1);
    this._growToScale = (mv.growToScale != null) ? mv.growToScale : this._growFromScale;
    this._growDur = Math.max(0, (mv.growDurationMs || 0) / 1000);
    this._growTime = 0;
    // 糸を切る挙動
    this._cutRopeOnTouch = !!mv.cutRopeOnTouch;
    // 親個体フラグと子供生成
    this._isParent = !!mv.isParent;
    this._spawnChildren = !!mv.spawnChildren;
    this._childType = mv.childType || null;
    this._childrenSpawned = false;
    // 上昇円運動
    this._circleUpward = !!mv.circleUpward;
    this._upwardSpeed = mv.upwardSpeed || 0;
    // 親の定期生成
    this._spawnInterval = mv.spawnInterval || 0;
    this._spawnTimer = 0;
    this._lastSpawnTime = 0;
    // 渦巻き運動
    this._spiralOutward = !!mv.spiralOutward;
    this._spiralRadius = mv.spiralRadius || 0;
    this._spiralOmega = mv.spiralOmega || 0;
    this._spiralExpandSpeed = mv.spiralExpandSpeed || 0;
    this._spiralTheta = 0;
    this._spiralStartX = 0;
    this._spiralStartY = 0;
    this._spiralCurrentRadius = 0;
    // 捕食プロパティ
    this._eatFishOnContact = !!mv.eatFishOnContact;
    this._eatRange = mv.eatRange || 0;
    // riseのときは水平速度に patrolSpeed を使う（なければ0）
    if (this._pattern === 'rise') {
      const px = Math.max(0, mv.patrolSpeed || 0);
      this.vx = dirSign * px;
    }
    // --- Wander (ランダム遊泳) Generalization ---
    this._wanderEnabled = !!mv.wanderEnabled;
    if (this._wanderEnabled) {
      this._wanderSpeed = Math.max(20, mv.wanderSpeed || mv.speed || 70);
      this._wanderInterval = Math.max(0.3, (mv.wanderInterval || 0.9));
      // Sekitoriiwashi specific override (stays for backward compatibility or specific tuning)
      if ((this.def?.id || '') === 'sekitoriiwashi') {
        this._reflectOnFishHit = true;
        this._randStraightEnabled = true;
        this._knockbackOnContact = true;
      }
    } else if ((this.def?.id || '') === 'sekitoriiwashi') {
      // Fallback for hardcoded ID if not in json yet
      this._wanderEnabled = true;
      this._wanderSpeed = Math.max(20, mv.wanderSpeed || mv.speed || 70);
      this._wanderInterval = Math.max(0.3, (mv.wanderInterval || 0.9));
      this._reflectOnFishHit = true;
      this._randStraightEnabled = true; // 判定用
      this._knockbackOnContact = true;
    }
    // --- 多角形移動（キチジ、タカノハダイ等） ---
    if (mv.polyMove) {
      this._polyMoveEnabled = true;
      this._polySpeed = Math.max(10, mv.polySpeed || mv.speed || 60);
      this._polyR = Math.max(20, mv.polyRadius || mv.polyR || 80);
      this._polySides = mv.polySides || 5;
      this._polyCx = (mv.polyCx != null) ? mv.polyCx : this.x;
      this._polyCy = (mv.polyCy != null) ? mv.polyCy : this.y;
      this._polyDriftX = mv.polyDriftX || 0;
      // 頂点の事前生成（上向きから時計回り）
      this._polyPts = [];
      for (let i = 0; i < this._polySides; i++) {
        const th = -Math.PI / 2 + i * (2 * Math.PI / this._polySides);
        const px2 = this._polyCx + this._polyR * Math.cos(th);
        const py2 = this._polyCy + this._polyR * Math.sin(th);
        this._polyPts.push({ x: px2, y: py2 });
      }
      this._polyIndex = 0;
    }
    // スケール振動
    this._scaleOscillation = !!mv.scaleOscillation;
    this._scaleMin = mv.scaleMin || 0.1;
    this._scaleMax = mv.scaleMax || 1.0;
    this._scaleOmega = mv.scaleOmega || ((mv.scaleFrequencyHz ? (Math.PI * 2 * mv.scaleFrequencyHz) : 0));
    // 回転
    this._rotationEnabled = !!mv.rotationSpeed;
    this._rotationSpeed = mv.rotationSpeed || 0;
    this._rotationAngle = 0;
    // --- 子魚生成（キングサーモン等） ---
    this._spawnChildEnabled = !!mv.spawnChild;
    this._spawnChildId = (typeof mv.spawnChild === 'string') ? mv.spawnChild : null;
    this._spawnChildInterval = Math.max(0.5, mv.spawnInterval || 3.0);
    this._spawnChildTimer = 0;
    if (this._spawnChildEnabled) {
      console.log(`[Fish] SpawnChild enabled for ${this.def.id}. Interval: ${this._spawnChildInterval}, Child: ${this._spawnChildId}`);
    }

    // --- 斜め沈下（ニシン等） ---
    this._sinkSpeed = mv.sinkSpeed || 0;

    // --- 固定回転・スケール (Ryugunotsukai support) ---
    this._fixedRotation = (mv.fixedRotation != null) ? Number(mv.fixedRotation) : null;
    this._fixedScaleX = mv.fixedScaleX || 1;
    this._fixedScaleY = mv.fixedScaleY || 1;
  }

  update(dt) { // dt in seconds
    this.t += dt;
    if (!this.el) return;
    if (this._shrinking) {
      this._shrinkTime += dt;
      const p = Math.min(1, (this._shrinkTime / Math.max(0.001, this._shrinkDur)));
      const fromW = Math.max(1, this._baseWidthPx || this.el.getBoundingClientRect()?.width || 40);
      const toFrac = Math.max(0, Math.min(1, this._shrinkToFrac || 0.2));
      const w = Math.max(1, Math.round(fromW * (1 - (1 - toFrac) * p)));
      try { this.el.style.width = `${w}px`; this.el.style.opacity = String(1 - p); } catch (_) { }
      // 位置は固定（現在位置を維持）
      this.setPosition(this.x, this.y);
      if (p >= 1) { this.unmount(); }
      return;
    }
    // 逃走＋フェードアウト演出を優先
    if (this._fleeing) {
      this._fleeTime += dt;
      const p = Math.min(1, (this._fleeTime / Math.max(0.001, this._fleeDur)));
      this.x += this._fleeVX * dt;
      this.y += this._fleeVY * dt;
      this.setPosition(this.x, this.y);
      try { this.el.style.opacity = String(1 - p); } catch (_) { }
      if (p >= 1) { this.unmount(); }
      return;
    }
    // --- カスタム更新: 五角形（キチジ） ---
    if (this._polyMoveEnabled && Array.isArray(this._polyPts) && this._polyPts.length >= 2) {
      // Drift logic
      if (this._polyDriftX) {
        const drift = this._polyDriftX * dt;
        this._polyCx += drift;
        this.x += drift;
        // Shift all points
        for (let i = 0; i < this._polyPts.length; i++) {
          this._polyPts[i].x += drift;
        }
      }
      const target = this._polyPts[this._polyIndex] || this._polyPts[0];
      const dx = (target.x - this.x);
      const dy = (target.y - this.y);
      const dist = Math.hypot(dx, dy);
      const step = this._polySpeed * dt;
      if (dist <= Math.max(1, step)) {
        this.x = target.x; this.y = target.y;
        this._polyIndex = (this._polyIndex + 1) % this._polyPts.length;
      } else if (isFinite(dist) && dist > 0) {
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
      }
      this.direction = (dx >= 0) ? 'right' : 'left';
      this.setPosition(this.x, this.y);
      // 可視化は不要（残像なし）
      return;
    }
    // --- カスタム更新: ランダム遊泳（セキトリイワシ） ---
    if (this._wanderEnabled) {
      this._wanderTimer -= dt;
      if (this._wanderTimer <= 0) {
        const ang = Math.random() * Math.PI * 2;
        this._wanderUx = Math.cos(ang); this._wanderUy = Math.sin(ang);
        const ln = Math.hypot(this._wanderUx, this._wanderUy) || 1; this._wanderUx /= ln; this._wanderUy /= ln;
        this._wanderTimer = this._wanderInterval * (0.6 + Math.random() * 0.8);
      }
      this.x += this._wanderSpeed * this._wanderUx * dt;
      this.y += this._wanderSpeed * this._wanderUy * dt;

      // 画面端処理 (offscreen許可なら外へ出て、遠すぎたら戻る)
      try {
        const pr = this.parent?.getBoundingClientRect?.();
        const er = this.el?.getBoundingClientRect?.();
        if (pr && er) {
          const halfW = Math.max(1, er.width / 2);
          const halfH = Math.max(1, er.height / 2);

          if (this._allowOffscreenX) {
            // 画面外許可: デスポーン距離(despawnOffX)付近まで行ったら戻るベクトルへ修正
            // マージン: despawnOffX の 90% くらいで折り返し
            const limit = Math.max(100, (this._despawnOffX || 100) * 0.9);
            if (this.x < -limit) {
              // 左に行き過ぎ -> 右へ
              if (this._wanderUx < 0) this._wanderUx = Math.abs(this._wanderUx);
            } else if (this.x > pr.width + limit) {
              // 右に行き過ぎ -> 左へ
              if (this._wanderUx > 0) this._wanderUx = -Math.abs(this._wanderUx);
            }
          } else {
            // 画面内バウンド (通常)
            if (this.x <= halfW) { this.x = halfW; this._wanderUx = Math.abs(this._wanderUx); }
            else if (this.x >= pr.width - halfW) { this.x = pr.width - halfW; this._wanderUx = -Math.abs(this._wanderUx); }
          }

          // Y軸は常にバウンド (とりあえず)
          if (this.y <= halfH) { this.y = halfH; this._wanderUy = Math.abs(this._wanderUy); }
          else if (this.y >= pr.height - halfH) { this.y = pr.height - halfH; this._wanderUy = -Math.abs(this._wanderUy); }
        }
      } catch (_) { }
      this.direction = (this._wanderUx >= 0) ? 'right' : 'left';
      this.setPosition(this.x, this.y);
      return;
    }
    // Global Base Rise (User Request: "謎の魚の大群"対策)
    // Avoid interfering with fleeing, shrinking, poly-move, or rushing
    if (!this._fleeing && !this._shrinking && !this._polyMoveEnabled && (!this.def || !this.def.movement?.rushToBaitX || !this._rushTargetX)) {
      const gRise = (Fish.GLOBAL_RISE_SPEED || 15) * dt;
      if (['sine', 'zigzag', 'drift'].includes(this._pattern)) {
        if (typeof this._baseY === 'number') this._baseY -= gRise;
      } else {
        // straight, patrol, rise, circle, doubleOrbit, etc.
        this.y -= gRise;
      }
    }

    if (this._pattern === 'straight') {
      this.x += this.vx * dt;
    } else if (this._pattern === 'patrol') {
      // 横に移動し、左右端で反転
      this.x += this.vx * dt; // 横移動は加速の影響を受けない
      try {
        const pr = this.parent?.getBoundingClientRect?.();
        const er = this.el?.getBoundingClientRect?.();
        if (pr && er) {
          const half = Math.max(1, er.width / 2);
          const minX = half;
          const maxX = Math.max(minX, pr.width - half);
          if (this.x <= minX) {
            this.x = minX;
            if (this.vx < 0) this.vx = Math.abs(this.vx);
            this.direction = 'right';
          } else if (this.x >= maxX) {
            this.x = maxX;
            if (this.vx > 0) this.vx = -Math.abs(this.vx);
            this.direction = 'left';
          }
        }
      } catch (_) { }
    } else if (this._pattern === 'sine') {
      this.x += this.vx * dt;
      this.y = this._baseY + this._amp * Math.sin(this._phase + this._omega * this.t);
    } else if (this._pattern === 'zigzag') {
      // 三角波で上下 or 左右を切替（簡易）
      this.x += this.vx * dt;
      const tri = 2 / Math.PI * Math.asin(Math.sin(this._phase + this._omega * this.t));
      this.y = this._baseY + this._amp * tri;
    } else if (this._pattern === 'drift') {
      // ゆらゆら: 低速 + サイン微摂動
      this.x += (this.vx * 0.2) * dt;
      this.y = this._baseY + this._amp * Math.sin(this._phase + this._omega * this.t);
    } else if (this._pattern === 'rise') {
      // 下から上へ上昇（ベース）
      const speed = this.def?.movement?.speed || 60; // px/s（上向き）
      const mul = this.worldSpeedMul || 1;
      const riseMul = (Fish._riseBaseMul || 1);
      this.vy = -Math.abs(speed) * mul * riseMul;
      this.y += this.vy * dt;
      // Allow horizontal drift (scatter)
      if (this.vx) this.x += this.vx * dt;

      // 追加: 上昇中のゆらぎ (sine wave)
      if (this._amp && this._omega) {
        const vxOsc = this._amp * this._omega * Math.cos(this._phase + this._omega * this.t);
        this.x += vxOsc * dt;
      }
      // 追加: 点滅テレポート
      if (this._blinkTeleport && !this._fleeing) {
        this._blinkTimer -= dt;
        if (this._blinkState === 'idle') {
          if (this._blinkTimer <= 0) {
            this._blinkState = 'blink';
            this._blinkTogglesLeft = this._blinkCount * 2; // ON/OFFトグル回数
            this._blinkTimer = this._blinkInterval;
          }
        } else if (this._blinkState === 'blink') {
          if (this._blinkTimer <= 0) {
            try {
              if (this.el) {
                const v = this.el.style.visibility;
                this.el.style.visibility = (v === 'hidden') ? 'visible' : 'hidden';
              }
            } catch (_) { }
            this._blinkTogglesLeft -= 1;
            if (this._blinkTogglesLeft <= 0) {
              // 終了: 可視化に戻す
              try { if (this.el) this.el.style.visibility = 'visible'; } catch (_) { }
              // テレポート
              try {
                const pr = this.parent?.getBoundingClientRect?.();
                const er = this.el?.getBoundingClientRect?.();
                if (pr && er) {
                  const halfW = Math.max(1, er.width / 2);
                  const halfH = Math.max(1, er.height / 2);
                  const rx = Math.random() * (pr.width - halfW * 2) + halfW;
                  const ry = Math.random() * (pr.height - halfH * 2) + halfH;
                  this.x = rx; this.y = ry;
                }
              } catch (_) { }
              this._blinkState = 'cooldown';
              this._blinkTimer = this._blinkCooldown;
            } else {
              this._blinkTimer = this._blinkInterval;
            }
          }
        } else if (this._blinkState === 'cooldown') {
          if (this._blinkTimer <= 0) { this._blinkState = 'idle'; this._blinkTimer = this._blinkCooldown; }
        }
      }
      // 追加: 水平パトロール（端で反転）
      if (this._addonPatrolX) {
        this.x += this.vx * dt; // 横移動は加速の影響を受けない
        try {
          const pr = this.parent?.getBoundingClientRect?.();
          const er = this.el?.getBoundingClientRect?.();
          if (pr && er && this._patrolEdgeBounce && !this._allowOffscreenX) {
            const half = Math.max(1, er.width / 2);
            const minX = half;
            const maxX = Math.max(minX, pr.width - half);
            if (this.x <= minX) {
              this.x = minX;
              if (this.vx < 0) this.vx = Math.abs(this.vx);
              this.direction = 'right';
            } else if (this.x >= maxX) {
              this.x = maxX;
              if (this.vx > 0) this.vx = -Math.abs(this.vx);
              this.direction = 'left';
            }
          }
        } catch (_) { }
      }
      // 追加: 餌から離れる（X方向）: 近距離で一定時間、反対方向へ加速
      if (this._avoidFromBaitX && this._avoidTargetX != null) {
        // 実行中
        if (this._avoidElapsed < this._avoidDur) {
          const away = (this.x - this._avoidTargetX) >= 0 ? 1 : -1; // 餌が右なら左へ, 餌が左なら右へ
          this.x += (this._avoidSpeed * away) * dt; // 横のみ、加速は乗せない
          this.direction = away >= 0 ? 'right' : 'left';
          this._avoidElapsed += dt;
          // 端での跳ね返り
          try {
            const pr = this.parent?.getBoundingClientRect?.();
            const er = this.el?.getBoundingClientRect?.();
            if (pr && er && !this._allowOffscreenX) {
              const half = Math.max(1, er.width / 2);
              const minX = half;
              const maxX = Math.max(minX, pr.width - half);
              if (this.x <= minX) { this.x = minX; this.direction = 'right'; }
              else if (this.x >= maxX) { this.x = maxX; this.direction = 'left'; }
            }
          } catch (_) { }
        } else {
          // トリガチェック
          const dx = this._avoidTargetX - this.x;
          if (Math.abs(dx) <= (this._avoidRange || 100)) {
            this._avoidElapsed = 0; // 再始動
          }
        }
      }
      // 追加: ランダム直進
      if (this._randStraightEnabled && this._randStraightSpeed > 0 && this._randUx != null) {
        this.x += this._randStraightSpeed * this._randUx * dt;
        this.y += this._randStraightSpeed * this._randUy * dt;
        this.direction = (this._randUx >= 0) ? 'right' : 'left';
      }
      // 追加: 横の大波（Xのみ）
      if (this._waveXEnabled && this._waveXAmplitude > 0 && this._waveXOmega !== 0) {
        const ox = this._waveXAmplitude * Math.sin(this._phase + this._waveXOmega * this.t);
        this.x += (ox - (this._waveXPrevOx || 0));
        this._waveXPrevOx = ox;
      }
      // 追加: 円/楕円運動（差分加算）
      if (this._circleEnabled && this._circleRadius > 0 && this._circleOmega !== 0) {
        this._circleTheta += this._circleOmega * dt;
        const ox = this._circleRadius * (this._ellipseXScale || 1) * Math.cos(this._circleTheta);
        const oy = this._circleRadius * (this._ellipseYScale || 1) * Math.sin(this._circleTheta);
        this.x += (ox - (this._circlePrevOx || 0));
        this.y += (oy - (this._circlePrevOy || 0));
        // 上昇成分を追加
        if (this._circleUpward) {
          const upwardSpeed = this._upwardSpeed || (Math.abs(this._circleOmega) * this._circleRadius * 0.3);
          this.y -= upwardSpeed * dt; // 上方向へ移動
        }
        this._circlePrevOx = ox; this._circlePrevOy = oy;
      }
      // 追加: ダブル軌道（惑星+衛星）
      if (this._doubleOrbit) {
        this._orbitTh1 += (this._orbitW1 || 0) * dt;
        const ox1 = (this._orbitR1 || 0) * Math.cos(this._orbitTh1);
        const oy1 = (this._orbitR1 || 0) * Math.sin(this._orbitTh1);
        this.x += (ox1 - (this._orbitPrevOx1 || 0));
        this.y += (oy1 - (this._orbitPrevOy1 || 0));
        this._orbitPrevOx1 = ox1; this._orbitPrevOy1 = oy1;
        this._orbitTh2 += (this._orbitW2 || 0) * dt;
        const ox2 = (this._orbitR2 || 0) * Math.cos(this._orbitTh2);
        const oy2 = (this._orbitR2 || 0) * Math.sin(this._orbitTh2);
        this.x += (ox2 - (this._orbitPrevOx2 || 0));
        this.y += (oy2 - (this._orbitPrevOy2 || 0));
        this._orbitPrevOx2 = ox2; this._orbitPrevOy2 = oy2;
      }
      // 追加: サンプリング追尾（一定間隔でベクトル更新）
      if (this._sampleSeekEnabled) {
        this._seekTimer += dt;
        if (this._seekTimer >= this._seekInterval) {
          this._seekTimer = 0;
          const tx = (this._seekTargetX != null) ? this._seekTargetX : this.x;
          const ty = (this._seekTargetY != null) ? this._seekTargetY : this.y;
          const dx = tx - this.x; const dy = ty - this.y;
          const len = Math.hypot(dx, dy);
          if (len > 1e-4) { this._seekUx = dx / len; this._seekUy = dy / len; }
        }
        if (this._seekUx != null && this._seekUy != null && this._seekSpeed > 0) {
          this.x += this._seekSpeed * this._seekUx * dt;
          this.y += this._seekSpeed * this._seekUy * dt;
          this.direction = (this._seekUx >= 0) ? 'right' : 'left';
        }
      }
      // 追加: レンジ内チェイス（餌）
      if (this._chaseInRange && this._chaseSpeed > 0 && this._chaseTargetX != null) {
        const tx = this._chaseTargetX; const ty = (this._chaseTargetY != null) ? this._chaseTargetY : this.y;
        const dx = tx - this.x; const dy = ty - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= (this._chaseRange || 0)) {
          const ux = dx / (dist || 1); const uy = dy / (dist || 1);
          this.x += this._chaseSpeed * ux * dt;
          this.y += this._chaseSpeed * uy * dt;
          this.direction = (ux >= 0) ? 'right' : 'left';
        }
      }
      // 追加: ランダムダート（シュッ→戻る→待機）
      if (this._dartEnabled) {
        this._dartTimer -= dt;
        if (this._dartState === 'idle') {
          if (this._dartTimer <= 0) {
            const ang = Math.random() * Math.PI * 2;
            let ux = Math.cos(ang), uy = Math.sin(ang);
            const ln = Math.hypot(ux, uy) || 1; ux /= ln; uy /= ln;
            this._dartUx = ux; this._dartUy = uy;
            this._dartState = 'dash';
            this._dartTimer = this._dartDur;
          }
        } else if (this._dartState === 'dash') {
          this.x += (this._dartSpeed * (this._dartUx || 0)) * dt;
          this.y += (this._dartSpeed * (this._dartUy || 0)) * dt;
          this.direction = (this._dartUx || 0) >= 0 ? 'right' : 'left';
          if (this._dartTimer <= 0) {
            if (this._dartReturnEnabled) {
              this._dartState = 'return';
              this._dartTimer = this._dartReturnDur;
            } else {
              this._dartState = 'idle';
              this._dartTimer = this._dartIntervalMin + Math.random() * (this._dartIntervalMax - this._dartIntervalMin);
            }
          }
        } else if (this._dartState === 'return') {
          const back = this._dartSpeed * (this._dartReturnFrac || 0);
          this.x -= back * (this._dartUx || 0) * dt;
          this.y -= back * (this._dartUy || 0) * dt;
          if (this._dartTimer <= 0) {
            this._dartState = 'idle';
            this._dartTimer = this._dartIntervalMin + Math.random() * (this._dartIntervalMax - this._dartIntervalMin);
          }
        }
      }
      // 追加: 第二近接魚への追尾 / 近接魚への追尾
      if ((this._seekSecondNearestFish || this._seekNearestFish) && this._seekOtherSpeed > 0 && this._seekOtherTargetX != null) {
        const tx = this._seekOtherTargetX; const ty = (this._seekOtherTargetY != null) ? this._seekOtherTargetY : this.y;
        const dx = tx - this.x; const dy = ty - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist > (this._seekAttachRadius || 0)) {
          const ux = dx / (dist || 1); const uy = dy / (dist || 1);
          this.x += this._seekOtherSpeed * ux * dt;
          this.y += this._seekOtherSpeed * uy * dt;
          this.direction = (ux >= 0) ? 'right' : 'left';
        }
      }
      // 追加: 餌方向への突進（斜め対応）。rushUntilOffscreen が true の場合は時間制限なし
      if (this._rushToBaitX && (this._rushUntilOffscreen || this._rushElapsed < this._rushDur)) {
        let ux = this._rushUx, uy = this._rushUy;
        if (this._rushHoming) {
          // ホーミング: 毎フレームターゲットへ向ける
          if (this._rushTargetX != null) {
            const tx = this._rushTargetX;
            const ty = (this._rushTargetY != null) ? this._rushTargetY : this.y;
            const dx = tx - this.x;
            const dy = ty - this.y;
            const len = Math.hypot(dx, dy);
            if (len > 1e-4) { ux = dx / len; uy = dy / len; }
          }
        } else {
          // 非ホーミング: 初回のみ固定方向を確定
          if (ux == null || uy == null) {
            const tx = (this._rushTargetX != null) ? this._rushTargetX : (this.x + (this.direction === 'right' ? 1 : -1));
            const ty = (this._rushTargetY != null) ? this._rushTargetY : this.y;
            const dx = tx - this.x; const dy = ty - this.y;
            const len = Math.hypot(dx, dy);
            if (len > 1e-4) { ux = dx / len; uy = dy / len; } else { ux = (this.direction === 'right' ? 1 : -1); uy = 0; }
            this._rushUx = ux; this._rushUy = uy;
          }
        }
        if (ux != null && uy != null) {
          const vxAdd = this._rushSpeed * ux; // 加速は適用しない（横・突進成分）
          const vyAdd = this._rushSpeed * uy; // 加速は適用しない（縦・突進成分）
          this.x += vxAdd * dt;
          this.y += vyAdd * dt;
          this.direction = vxAdd >= 0 ? 'right' : 'left';
        }
        if (!this._rushUntilOffscreen) this._rushElapsed += dt;
      }
      // 追加: パルス拡縮（サイズ）
      if (this._pulsateEnabled && this._pulsateAmp > 0 && this._pulsateOmega !== 0 && this.el && this._baseWidthPx > 0) {
        const s = 1 + this._pulsateAmp * Math.sin(this._pulsatePhase + this._pulsateOmega * this.t);
        const w = Math.max(1, Math.round(this._baseWidthPx * s));
        try { this.el.style.width = `${w}px`; } catch (_) { }
      }
      // 追加: Opacity Blink
      if (this._blinkOpacityEnabled && this._blinkOpacityOmega !== 0 && this.el && !this._fleeing) {
        const osc = Math.sin(this._blinkOpacityPhase + this._blinkOpacityOmega * this.t); // -1 to 1
        // Base - Amp * (0 to 1) allows blinking out. Or Base + Amp * osc.
        // Let's use: val = Base + Amp * osc. Clamp 0-1.
        let a = (this._baseOpacity) + this._blinkOpacityAmp * osc;
        a = Math.max(0, Math.min(1, a));
        try { this.el.style.opacity = a.toFixed(2); } catch (_) { }
      }
      // 追加: スケール振動（最小〜最大）
      if (this._scaleOscillation && this.el && this._baseWidthPx > 0) {
        const k = (Math.sin(this._pulsatePhase + this._scaleOmega * this.t) + 1) / 2; // 0..1
        const s = this._scaleMin + (this._scaleMax - this._scaleMin) * k;
        const w = Math.max(1, Math.round(this._baseWidthPx * s));
        try { this.el.style.width = `${w}px`; } catch (_) { }
      }
      // 追加: 回転
      if (this._rotationEnabled) {
        this._rotationAngle = (this._rotationAngle + this._rotationSpeed * dt) % 360;
        // setPosition で適用される
      }
    } else if (this._pattern === 'circle') {
      // 円運動のみ（上昇はcircleUpwardで別途処理）
      // 基本的な位置は固定で、円運動は_circleEnabledで処理
      this.vx = 0;
      this.vy = 0;
    } else if (this._pattern === 'spiral') {
      // 渦巻き運動＋上昇
      this.vx = 0;
      this.vy = -40; // 上昇速度
      if (this._spiralOutward && this._spiralOmega !== 0) {
        this._spiralTheta += this._spiralOmega * dt;
        this._spiralCurrentRadius += this._spiralExpandSpeed * dt;
        const ox = this._spiralCurrentRadius * Math.cos(this._spiralTheta);
        const oy = this._spiralCurrentRadius * Math.sin(this._spiralTheta);
        this.x = this._spiralStartX + ox;
        this.y = this._spiralStartY + oy + (this.vy * dt * 60); // 上昇成分を追加
      }
    } else if (this._pattern === 'static') {
      // 静止（クジラウオ用）
      this.vx = 0;
      this.vy = 0;
    } else {
      this.x += this.vx * dt;
    }
    if (this._waveVisEnabled && this._waveDots && this._waveDots.length && (this._amp || 0) > 0 && (this._omega || 0) !== 0) {
      const vxAbs = Math.abs(this.vx) || 1;
      const step = this._waveStepX || 6;
      const count = this._waveDots.length;
      const backSign = (this.vx < 0) ? 1 : -1;
      for (let i = 0; i < count; i++) {
        const dx = step * i;
        const tt = this.t - (dx / vxAbs);
        const dotX = this.x + backSign * dx;
        const dotY = this._baseY + (this._amp || 0) * Math.sin((this._phase || 0) + (this._omega || 0) * tt);
        const d = this._waveDots[i];
        if (d) {
          d.style.left = `${dotX}px`;
          d.style.top = `${dotY}px`;
        }
        this.setPosition(this.x, this.y);
      }
    }
    // 追加: 子魚生成
    if (this._spawnChildEnabled && this._spawnChildId && this.onSpawnChild) {
      this._spawnChildTimer += dt;
      if (this._spawnChildTimer >= this._spawnChildInterval) {
        this._spawnChildTimer = 0;
        this.onSpawnChild(this.x, this.y, this._spawnChildId);
      }
    }
    // 追加: 強制沈下（斜め移動用）
    if (this._sinkSpeed !== 0) {
      this._baseY += this._sinkSpeed * dt;
      this.y += this._sinkSpeed * dt;
    }
    this.setPosition(this.x, this.y);
  }

  getBounds() {
    return this.el ? this.el.getBoundingClientRect() : null;
  }

  // 小さめの横長の当たり矩形（hantei.png のアスペクト比に基づく）
  getHitRect() {
    // 逃走中 or 明示的に無効化中はヒットさせない
    if (this._hitDisabled || this._fleeing) return null;
    const r = this.getBounds();
    if (!r) return null;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const aspectWtoH = this.def?.hitboxAspect || Fish._hitAspectWtoH || 4.0; // 横:縦（ワイド）。デフォルト4:1
    // まず幅を画像幅の0.8倍に、そこから高さを算出
    let w = r.width * 0.8;
    let h = w / aspectWtoH;
    // 高さが元画像の0.6倍を超えるなら抑制し、幅を再計算
    const hMax = r.height * (this.def?.hitboxHeightMaxRatio || 0.6);
    if (h > hMax) { h = hMax; w = h * aspectWtoH; }

    // カスタムスケール適用
    const scale = this.def?.hitboxScale || 1.0;
    w *= scale;
    h *= scale;

    return {
      left: cx - w / 2,
      top: cy - h / 2,
      right: cx + w / 2,
      bottom: cy + h / 2,
      width: w,
      height: h,
      x: cx - w / 2,
      y: cy - h / 2
    };
  }

  // 逃走中か
  isFleeing() {
    return !!this._fleeing;
  }

  // 当たり判定を無効化
  disableHitbox() { this._hitDisabled = true; }

  // 現在の運動ベクトルと逆方向へ移動しながらフェードアウトして消える
  // durationMs: 演出時間（ミリ秒）, speedMul: 逆ベクトルに掛ける倍率
  startFleeAndFadeOut(durationMs = 450, speedMul = 1) {
    try {
      const baseSpeed = Math.abs(this.def?.movement?.speed || 40) * (this.worldSpeedMul || 1);
      let svx = this.vx, svy = this.vy;
      const spd = Math.hypot(svx, svy);
      if (!isFinite(spd) || spd < 1) {
        // 停止に近い場合は向きからベース速度を採用（横方向）
        const dirSign = (this.direction === 'left') ? -1 : 1;
        svx = dirSign * baseSpeed;
        svy = 0;
      }
      this._fleeVX = -svx * (speedMul || 1);
      this._fleeVY = -svy * (speedMul || 1);
      this._fleeDur = Math.max(0.1, (durationMs || 450) / 1000);
      this._fleeTime = 0;
      this._fleeing = true;
      this._hitDisabled = true; // 触れた瞬間に当たりを消す
      if (this.el) this.el.style.opacity = '1';
    } catch (_) {
      this._fleeVX = 0; this._fleeVY = 0;
      this._fleeDur = Math.max(0.1, (durationMs || 450) / 1000);
      this._fleeTime = 0;
      this._fleeing = true;
      this._hitDisabled = true; // フォールバックでも当たりは消す
    }
  }
}

// 全体の基礎上昇速度倍率（グローバル調整用）
// 全体の基礎上昇速度倍率（グローバル調整用）
Fish._riseBaseMul = 1.6;
Fish.GLOBAL_RISE_SPEED = 20; // 基礎浮上速度 (px/s)

// ガイド画像（assets/hantei.png）のアスペクト比（横/縦）を一度だけ取得
Fish._hitAspectWtoH = 4.0; // フォールバック
Fish._guideLoading = false;
Fish._ensureHitGuide = () => {
  if (Fish._guideLoading) return;
  Fish._guideLoading = true;
  try {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        Fish._hitAspectWtoH = img.naturalWidth / img.naturalHeight;
      }
    };
    img.onerror = () => { };
    img.src = 'assets/hantei.png';
  } catch (_) { }
};

export default Fish;
