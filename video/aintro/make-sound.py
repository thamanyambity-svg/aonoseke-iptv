"""Génère assets/aintro.wav : le son original du film d'intro (aucun extrait extérieur).

Coup grave à l'apparition de la lettre, nappe pendant la poussée, montée tonale + souffle pendant le rideau de lumière,
grand coup final avec accord au moment du flash (≈ 3,55 s).

Usage : python3 make-sound.py        (nécessite numpy)
Le résultat est identique à chaque exécution (graine fixe).
"""
import wave

import numpy as np

SR = 48000
T = 4.4
n = int(SR * T)
t = np.arange(n) / SR
rng = np.random.default_rng(7)


def env_exp(t0, decay):
    e = np.exp(-decay * np.clip(t - t0, 0, None))
    e[t < t0] = 0
    return e


def boom(t0, f0, f1, k, decay, amp):
    """Sinus dont la hauteur chute de f0 vers f1 (coup de grosse caisse / sub)."""
    tt = np.clip(t - t0, 0, None)
    f = f1 + (f0 - f1) * np.exp(-k * tt)
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(t0, decay)


x = np.zeros(n)
x += boom(0.17, 120, 46, 9, 4.2, 0.95)   # premier coup grave
x += boom(0.17, 900, 200, 40, 60, 0.18)  # claquement d'attaque

# nappe grave qui accompagne la poussée (0,5 → 2,2 s)
a = np.clip((t - 0.5) / 0.8, 0, 1) * np.clip((2.35 - t) / 0.35, 0, 1)
x += 0.16 * a * np.sin(2 * np.pi * (62 + 8 * np.clip((t - 0.5) / 1.8, 0, 1)) * t)

# montée tonale + souffle pendant l'ouverture du rideau (2,2 → 3,5 s)
u = np.clip((t - 2.2) / 1.3, 0, 1)
f = 220 * (8 ** u)  # 220 Hz → 1760 Hz
ph = 2 * np.pi * np.cumsum(f) / SR
rise = (np.sin(ph) + 0.6 * np.sin(ph * 1.5) + 0.35 * np.sin(ph * 2.01)) * (u ** 2.2)
fade = np.clip((3.95 - t) / 0.45, 0, 1)
x += 0.20 * rise * fade * (t >= 2.2)
noise = rng.standard_normal(n)
hp = noise - np.convolve(noise, np.ones(24) / 24, mode="same")
x += 0.22 * hp * (u ** 3) * fade * (t >= 2.2)

# grand coup final + accord (≈ 3,55 s)
x += boom(3.55, 140, 38, 6, 3.0, 1.0)
for fr, am in ((110, 0.14), (165, 0.10), (220, 0.10), (330, 0.06)):
    x += am * np.sin(2 * np.pi * fr * t) * env_exp(3.55, 2.2)

x *= np.clip((T - t) / 0.2, 0, 1)
x = np.tanh(1.4 * x) / np.tanh(1.4)
x *= 0.9 / np.max(np.abs(x))
stereo = np.stack([x, np.roll(x, int(0.0004 * SR))], axis=1)
pcm = (stereo * 32767).astype("<i2")
with wave.open("assets/aintro.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("assets/aintro.wav écrit")
