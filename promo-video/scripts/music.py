"""为宣传片合成原创配乐（无版权依赖）：D 宫五声音阶氛围铺底 + 拨弦琶音 + 心跳式低频脉冲 + 转场闪光。
输出 build/music.wav（44.1kHz 立体声，65 秒）。下文时间点均为「正片时间」，与 composition/index.html 的场景关键帧一致；
片头 COVER 秒封面镜头只有和弦铺底（正片时间为负）。
"""
import os
import wave
import numpy as np

SR = 44100
COVER = 2.0  # 与 composition/index.html 的 COVER 保持一致
DUR = 63.0 + COVER
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(20260925)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def env_adsr(n, a, r, sustain=1.0):
    e = np.ones(n) * sustain
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, sustain, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def place(buf, sig, start):
    i = int((start + COVER) * SR)
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


L = np.zeros(N)
R = np.zeros(N)

# ——— 1. 铺底和弦（温暖、缓慢起伏）———
# D 宫五声：D E F# A B；和弦进行 每段约 8 秒
chords = [
    (-COVER, [50, 57, 62, 64, 69]),  # D add9（从封面开始）
    (8, [47, 54, 59, 62, 66]),     # Bm7
    (15.5, [50, 57, 62, 66, 69]),  # D
    (22, [43, 50, 57, 62, 66]),    # G add9 感
    (30, [45, 52, 57, 61, 64]),    # A sus
    (37, [47, 54, 59, 62, 66]),    # Bm
    (46, [43, 50, 55, 59, 62]),    # G
    (52, [45, 52, 57, 64, 69]),    # A
    (56, [50, 57, 62, 66, 69, 74]),  # D 终止
]
for k, (start, notes) in enumerate(chords):
    end = chords[k + 1][0] if k + 1 < len(chords) else DUR - COVER
    length = end - start + 2.5  # 与下一和弦交叠
    n = int(length * SR)
    tt = np.arange(n) / SR
    e = env_adsr(n, 2.0, 2.5)
    for m in notes:
        f = hz(m)
        for det, pan in ((-0.12, 0.3), (0.12, 0.7)):
            ff = f * 2 ** (det / 12)
            # 柔和音色：基频 + 少量二、三次谐波 + 慢速颤音
            vib = 1 + 0.002 * np.sin(2 * np.pi * 0.25 * tt + m)
            s = (np.sin(2 * np.pi * ff * vib * tt) + 0.25 * np.sin(4 * np.pi * ff * tt) + 0.08 * np.sin(6 * np.pi * ff * tt))
            s *= e * 0.018 * (0.6 if m > 66 else 1.0)
            place(L, s * (1 - pan), start)
            place(R, s * pan, start)

# ——— 2. 低音持续音 ———
for start, m, length in [(-COVER, 38, 15.5 + COVER), (15.5, 38, 14.5), (30, 33, 7), (37, 35, 9), (46, 31, 6), (52, 33, 4), (56, 38, 7)]:
    n = int((length + 1.5) * SR)
    tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * hz(m) * tt) * env_adsr(n, 1.2, 1.5) * 0.05
    place(L, s, start)
    place(R, s, start)

# ——— 3. 拨弦琶音（古筝/钢片琴质感），从品牌露出后开始 ———
def pluck(m, amp=0.07, decay=1.6):
    n = int(3.5 * SR)
    tt = np.arange(n) / SR
    f = hz(m)
    s = (np.sin(2 * np.pi * f * tt) + 0.45 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 3)
         + 0.2 * np.sin(2 * np.pi * 3.01 * f * tt) * np.exp(-tt * 5))
    return s * np.exp(-tt * decay) * np.minimum(1, tt / 0.004) * amp


scale = [62, 64, 66, 69, 71, 74, 76, 78, 81]
beat = 60 / 76  # 76 BPM
pattern = [0, 2, 4, 3, 5, 4, 2, 3]
x = 15.5
i = 0
while x < 55.5:
    # 每个场景切换处重新起句
    m = scale[pattern[i % len(pattern)] + (1 if (i // 8) % 2 else 0)]
    pan = 0.5 + 0.35 * np.sin(i * 1.3)
    s = pluck(m, amp=0.05 if i % 2 else 0.065)
    place(L, s * (1 - pan), x)
    place(R, s * pan, x)
    x += beat / 2 if 22 <= x < 46 else beat
    i += 1

# 开场与结尾的稀疏音符
for tm, m in [(0.8, 74), (2.1, 78), (3.2, 81), (5.6, 69), (6.8, 71), (8.0, 66), (57.2, 74), (57.9, 78), (58.5, 81), (59.3, 86), (60.4, 81)]:
    s = pluck(m, amp=0.06, decay=0.9)
    place(L, s * 0.6, tm)
    place(R, s * 0.4, tm + 0.012)

# ——— 4. 心跳式低频脉冲（功能段落，增加推进感）———
def thump(amp=0.22):
    n = int(0.5 * SR)
    tt = np.arange(n) / SR
    f = 55 * np.exp(-tt * 9) + 42
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt * 10) * amp


x = 15.5
while x < 52:
    place(L, thump(), x)
    place(R, thump(), x)
    x += beat

# ——— 5. 转场闪光（高频泛音扫过）与品牌露出的上扬 ———
def shimmer(length=1.6, amp=0.05):
    n = int(length * SR)
    tt = np.arange(n) / SR
    s = np.zeros(n)
    for m in (86, 90, 93, 98):
        s += np.sin(2 * np.pi * hz(m) * tt + rng.uniform(0, 6))
    return s * np.sin(np.pi * np.clip(tt / length, 0, 1)) ** 2 * amp


def riser(length=2.0, amp=0.08):
    n = int(length * SR)
    noise = rng.standard_normal(n)
    # 一阶低通，截止频率随时间上升
    y = np.zeros(n)
    for k in range(1, n):
        a = 0.02 + 0.3 * (k / n) ** 2
        y[k] = y[k - 1] + a * (noise[k] - y[k - 1])
    return y * np.linspace(0, 1, n) ** 2 * amp


for tm in (15.3, 21.9, 29.9, 36.9, 45.9, 51.9):
    s = shimmer()
    place(L, s, tm)
    place(R, np.roll(s, 300), tm)
for tm in (8.2, 54.2):
    s = riser()
    place(L, s, tm)
    place(R, s, tm)

# 品牌露出的低音冲击
for tm in (10.2, 56.2):
    n = int(3 * SR)
    tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * 36.7 * tt) * np.exp(-tt * 1.5) * 0.3
    place(L, s, tm)
    place(R, s, tm)

# ——— 6. 混响（指数衰减噪声脉冲响应，FFT 卷积）———
def reverb(x, secs=3.2, wet=0.28):
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 2.2)
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return x * (1 - wet) + y * wet


L, R = reverb(L), reverb(R)

# 整体淡入淡出与响度归一化（峰值 -1 dBFS）
fade = np.ones(N)
fade[: int(0.6 * SR)] = np.linspace(0, 1, int(0.6 * SR))
fade[-int(2.5 * SR):] = np.linspace(1, 0, int(2.5 * SR)) ** 1.5
L *= fade
R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
g = 10 ** (-1 / 20) / peak
stereo = np.stack([L * g, R * g], axis=1)

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(root, 'build'), exist_ok=True)
out = os.path.join(root, 'build/music.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype('<i2').tobytes())
print('music written to', out)
