import React, { useState, useEffect, useRef } from 'react';

interface AlarmTimeout {
  soundInterval: NodeJS.Timeout;
  timeout: NodeJS.Timeout;
}

// Web Audio API の型を拡張
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const AnalogClock = () => {
  const [time, setTime] = useState(new Date());
  const [alarmTime, setAlarmTime] = useState('');
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [isAlarming, setIsAlarming] = useState(false);
  const [alarmTimeout, setAlarmTimeout] = useState<AlarmTimeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // アラーム音を生成する関数
  const createAlarmSound = () => {
    if (!audioContextRef.current) {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextConstructor) {
        audioContextRef.current = new AudioContextConstructor();
      } else {
        console.warn('Web Audio API is not supported in this browser');
        return null;
      }
    }
    
    const audioContext = audioContextRef.current;
    if (!audioContext) return null;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    return oscillator;
  };

  // アラーム開始
  const startAlarm = () => {
    setIsAlarming(true);
    
    // アラーム音を繰り返し再生
    const playAlarmSound = () => {
      createAlarmSound();
    };
    
    playAlarmSound();
    const soundInterval = setInterval(playAlarmSound, 600);
    
    // 15秒後に自動停止
    const timeout = setTimeout(() => {
      clearInterval(soundInterval);
      setIsAlarming(false);
      setAlarmEnabled(false);
    }, 15000);
    
    setAlarmTimeout({ soundInterval, timeout });
  };

  // アラーム停止
  const stopAlarm = () => {
    if (alarmTimeout) {
      clearInterval(alarmTimeout.soundInterval);
      clearTimeout(alarmTimeout.timeout);
    }
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {
        // oscillatorが既に停止している場合のエラーを無視
      }
    }
    setIsAlarming(false);
    setAlarmEnabled(false);
    setAlarmTimeout(null);
  };

  // アラーム時刻チェック
  useEffect(() => {
    if (alarmEnabled && alarmTime && !isAlarming) {
      const currentTimeString = time.toTimeString().substring(0, 5);
      if (currentTimeString === alarmTime) {
        startAlarm();
      }
    }
  }, [time, alarmTime, alarmEnabled, isAlarming]);

  // アラーム設定の切り替え
  const toggleAlarm = () => {
    if (isAlarming) {
      stopAlarm();
    } else {
      setAlarmEnabled(!alarmEnabled);
    }
  };

  // 角度を計算（12時の位置を0度として時計回り）
  const secondAngle = (time.getSeconds() * 6) - 90; // 6度/秒
  const minuteAngle = (time.getMinutes() * 6 + time.getSeconds() * 0.1) - 90; // 6度/分 + 秒の細かい動き
  const hourAngle = (time.getHours() % 12 * 30 + time.getMinutes() * 0.5) - 90; // 30度/時 + 分の細かい動き

  // 時刻の数字（1-12）
  const numbers = [];
  for (let i = 1; i <= 12; i++) {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const x = 200 + 150 * Math.cos(angle);
    const y = 200 + 150 * Math.sin(angle);
    numbers.push(
      <text 
        key={i} 
        x={x} 
        y={y + 6} 
        textAnchor="middle" 
        className="text-xl font-bold fill-gray-800"
      >
        {i}
      </text>
    );
  }

  // 分の目盛り
  const minuteMarks = [];
  for (let i = 0; i < 60; i++) {
    if (i % 5 !== 0) { // 5の倍数以外（時間の目盛りを除く）
      const angle = (i * 6 - 90) * (Math.PI / 180);
      const x1 = 200 + 170 * Math.cos(angle);
      const y1 = 200 + 170 * Math.sin(angle);
      const x2 = 200 + 180 * Math.cos(angle);
      const y2 = 200 + 180 * Math.sin(angle);
      minuteMarks.push(
        <line 
          key={i} 
          x1={x1} 
          y1={y1} 
          x2={x2} 
          y2={y2} 
          stroke="#666" 
          strokeWidth="1"
        />
      );
    }
  }

  // 時間の目盛り
  const hourMarks = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const x1 = 200 + 160 * Math.cos(angle);
    const y1 = 200 + 160 * Math.sin(angle);
    const x2 = 200 + 180 * Math.cos(angle);
    const y2 = 200 + 180 * Math.sin(angle);
    hourMarks.push(
      <line 
        key={i} 
        x1={x1} 
        y1={y1} 
        x2={x2} 
        y2={y2} 
        stroke="#333" 
        strokeWidth="3"
      />
    );
  }

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen relative py-8"
      style={{
        background: `
          linear-gradient(
            135deg,
            #f5f3f0 0%,
            #ede7e0 25%,
            #f0ebe4 50%,
            #ede7e0 75%,
            #f5f3f0 100%
          )
        `
      }}
    >
      {/* 木目調テクスチャー */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(139,119,101,0.1) 2px,
              rgba(139,119,101,0.1) 3px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 8px,
              rgba(160,140,120,0.05) 8px,
              rgba(160,140,120,0.05) 12px
            )
          `
        }}
      />
      
      {/* 時計 */}
      <div className="relative z-10 flex items-center justify-center mb-8" style={{ width: '400px', height: '400px' }}>
        <svg width="400" height="400" className="drop-shadow-lg" viewBox="0 0 400 400">
          {/* 外側の白い枠 */}
          <circle 
            cx="200" 
            cy="200" 
            r="195" 
            fill="white" 
            stroke="#ddd" 
            strokeWidth="2"
          />
          
          {/* 時計の縁（木製風） */}
          <circle 
            cx="200" 
            cy="200" 
            r="185" 
            fill="none" 
            stroke="#8B4513" 
            strokeWidth="8"
          />
          
          {/* 文字盤 */}
          <circle 
            cx="200" 
            cy="200" 
            r="177" 
            fill="#fefefe" 
            stroke="#e5e5e5" 
            strokeWidth="1"
          />

          {/* 分の目盛り */}
          {minuteMarks}
          
          {/* 時間の目盛り */}
          {hourMarks}
          
          {/* 数字 */}
          {numbers}

          {/* 短針（時針） */}
          <line
            x1="200"
            y1="200"
            x2={200 + 80 * Math.cos(hourAngle * Math.PI / 180)}
            y2={200 + 80 * Math.sin(hourAngle * Math.PI / 180)}
            stroke="#333"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* 長針（分針） */}
          <line
            x1="200"
            y1="200"
            x2={200 + 110 * Math.cos(minuteAngle * Math.PI / 180)}
            y2={200 + 110 * Math.sin(minuteAngle * Math.PI / 180)}
            stroke="#555"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* 秒針 */}
          <line
            x1="200"
            y1="200"
            x2={200 + 120 * Math.cos(secondAngle * Math.PI / 180)}
            y2={200 + 120 * Math.sin(secondAngle * Math.PI / 180)}
            stroke="#dc2626"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* 中心の円 */}
          <circle 
            cx="200" 
            cy="200" 
            r="12" 
            fill="#333"
          />
          <circle 
            cx="200" 
            cy="200" 
            r="6" 
            fill="#dc2626"
          />
        </svg>
      </div>
      
      {/* アラーム設定パネル */}
      <div className="relative z-10 bg-white bg-opacity-95 rounded-lg shadow-lg p-4 max-w-sm w-full mx-4">
        <div className="text-center">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">アラーム設定</h3>
          
          {/* アラーム時刻入力 */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <input
              type="time"
              value={alarmTime}
              onChange={(e) => setAlarmTime(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isAlarming}
            />
            <button
              onClick={toggleAlarm}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors min-w-20 ${
                isAlarming
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : alarmEnabled
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              {isAlarming ? 'アラーム停止' : alarmEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          
          {/* アラーム状態表示 */}
          <div className="text-sm mb-3">
            {isAlarming && (
              <div className="text-red-500 font-semibold animate-pulse">
                🔔 アラームが鳴っています！
              </div>
            )}
            {alarmEnabled && !isAlarming && alarmTime && (
              <div className="text-green-600">
                ⏰ アラーム設定: {alarmTime}
              </div>
            )}
            {!alarmEnabled && (
              <div className="text-gray-400">
                アラーム: オフ
              </div>
            )}
          </div>
          
          {/* デジタル時刻表示 */}
          <div className="border-t pt-3">
            <div className="text-lg font-mono text-gray-700">
              {time.toLocaleTimeString('ja-JP')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalogClock;