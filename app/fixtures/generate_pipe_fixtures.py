"""Independent fixtures for S07, S04, S08 and the composite pipe lesson (Run 2B).

Written separately from the TypeScript, using the spec text and app/docs/COMPOSITE_PIPE_SPEC.md:
  * mpmath at 50 significant digits;
  * Colebrook solved with mpmath.findroot on f itself (Illinois bracketing on f in [0.002, 0.5]),
    not by bisection on 1/sqrt(f) as in the TypeScript;
  * cross-check of every turbulent f against fluids.friction.Colebrook (version recorded).
Regime thresholds and suppression rules are coded here from the spec text, independently.
Run from the repo root:  .venv/bin/python -I app/fixtures/generate_pipe_fixtures.py
"""
import json
import random
from pathlib import Path

import mpmath as mp
import fluids
from fluids.friction import Colebrook as fluids_colebrook

mp.mp.dps = 50
G = mp.mpf("9.80665")
OUT = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "pipe.fixtures.json"


def M(x):
    return mp.mpf(str(x))


def num(x):
    return None if x is None else {"float": float(x), "exact": mp.nstr(x, 30)}


def colebrook_f(Re, rr):
    Re, rr = M(Re), M(rr)
    F = lambda f: 1 / mp.sqrt(f) + 2 * mp.log10(rr / M("3.7") + M("2.51") / (Re * mp.sqrt(f)))
    return mp.findroot(F, (M("0.002"), M("0.5")), solver="illinois", tol=mp.mpf(10) ** -40, maxsteps=400)


def regime(Re):
    if Re == 0:
        return "no-flow"
    if Re < 2300:
        return "laminar"
    if Re < 4000:
        return "transitional"
    if Re <= 10 ** 7:
        return "turbulent"
    return "beyond-envelope"


def friction(Re, rr):
    r = regime(Re)
    if r == "laminar":
        return r, 64 / Re
    if r == "turbulent" and rr <= M("0.05"):
        return r, colebrook_f(Re, rr)
    return r, None


# ---------------- S07 ----------------
def re(rho, v, D, mu):
    return M(rho) * M(v) * M(D) / M(mu)


s07 = {
    "default_fixed_speed": num(re(1000, "0.1", "0.02", "0.001")),
    "double_D_fixed_speed": num(re(1000, "0.1", "0.04", "0.001")),
    "fixed_flow_D": num(re(1000, 4 * M("3.1416e-5") / (mp.pi * M("0.02") ** 2), "0.02", "0.001")),
    "fixed_flow_2D": num(re(1000, 4 * M("3.1416e-5") / (mp.pi * M("0.04") ** 2), "0.04", "0.001")),
}


# ---------------- S04 ----------------
def s04(Q, D1, D2, dz, p1, K, hp, rho=1000):
    Q, D1, D2, dz, p1, K, hp, rho = map(M, (Q, D1, D2, dz, p1, K, hp, rho))
    v1 = 4 * Q / (mp.pi * D1 ** 2)
    v2 = 4 * Q / (mp.pi * D2 ** 2)
    hL = K * v2 ** 2 / (2 * G)
    p2 = p1 + rho * G * (0 - dz + hp - hL) + rho * (v1 ** 2 - v2 ** 2) / 2
    return {"v1": v1, "v2": v2, "loss_head": hL, "p2": p2,
            "total_head_1": p1 / (rho * G) + v1 ** 2 / (2 * G), "total_head_2": p2 / (rho * G) + v2 ** 2 / (2 * G) + dz}


s04_cases = []
for name, args in [("default", (0.001, 0.05, 0.025, 0, 101325, 0, 0)), ("equal-areas", (0.001, 0.05, 0.05, 0, 101325, 0, 0)),
                   ("plus-1m-head", (0.001, 0.05, 0.025, 0, 101325, 0, 1)), ("losses-K2", (0.0015, 0.06, 0.02, 0.5, 120000, 2, 0)),
                   ("rise-1m", (0.001, 0.05, 0.025, 1, 101325, 0, 0))]:
    o = s04(*args)
    s04_cases.append({"name": name, "inputs": dict(zip(["Q", "D1", "D2", "dz", "p1", "K", "hp"], args)),
                      "outputs": {k: num(v) for k, v in o.items()}})
base = s04(0.001, 0.05, 0.025, 0, 101325, 0, 0)
hp_req = (M(101325) - base["p2"]) / (M(1000) * G)

# ---------------- S08 ----------------
s08_points = []
for Re in [4000, 4500, 1e4, 5e4, 1e5, 1e6, 1e7]:
    for rr in [0, 1e-6, 1e-4, 1e-3, 1e-2, 0.05]:
        f = colebrook_f(Re, rr)
        s08_points.append({"Re": Re, "rr": rr, "f": num(f), "fluids": float(fluids_colebrook(Re, rr))})

# ---------------- composite ----------------
def pipe(c):
    Q, D1, D2, dz, L, eps, rho, mu, p1, K = (M(c[k]) for k in ["Q", "D1", "D2", "dz", "L", "eps", "rho", "mu", "p1", "K"])
    v1 = 4 * Q / (mp.pi * D1 ** 2)
    v2 = 4 * Q / (mp.pi * D2 ** 2)
    Re1, Re2 = rho * v1 * D1 / mu, rho * v2 * D2 / mu
    rr = eps / D2
    reg, f = friction(Re2, rr)
    hK = K * v2 ** 2 / (2 * G)
    if L == 0 or reg == "no-flow":
        hf = M(0)
    else:
        hf = None if f is None else f * (L / D2) * v2 ** 2 / (2 * G)
    p2i = p1 + rho * (v1 ** 2 - v2 ** 2) / 2
    p3i = p2i - rho * G * dz
    p2 = p2i - rho * G * hK
    p3 = None if hf is None else p2 - rho * G * dz - rho * G * hf
    pos = lambda p: p is not None and p > 0
    p2o = p2 if pos(p2) else None
    p3o = p3 if (pos(p2) and pos(p3)) else None
    p2io = p2i if pos(p2i) else None
    p3io = p3i if (pos(p2i) and pos(p3i)) else None
    H = lambda p, v, z: None if p is None else p / (rho * G) + v ** 2 / (2 * G) + z
    return {"v1": v1, "v2": v2, "Re1": Re1, "Re2": Re2, "regime": reg, "f": f, "h_K": hK, "h_f": hf,
            "p2": p2o, "p3": p3o, "p2_ideal": p2io, "p3_ideal": p3io,
            "H1": H(p1, v1, 0), "H2": H(p2o, v2, 0), "H3": H(p3o, v2, dz)}


D = {"Q": 0.001, "D1": 0.05, "D2": 0.025, "dz": 0, "L": 10, "eps": 0, "rho": 1000, "mu": 0.001, "p1": 101325, "K": 0}
named = [
    ("default", D), ("task-a", dict(D, L=0)), ("task-b", dict(D, K=0.3)), ("zero-loss-K0-L0", dict(D, L=0, K=0, dz=0)),
    ("laminar-mu0.05", dict(D, mu=0.05)), ("transitional-mu0.015", dict(D, mu=0.015)),
    ("transitional-L0", dict(D, mu=0.015, L=0)), ("rough", dict(D, eps=0.0005)), ("too-rough", dict(D, eps=0.001, D2=0.015)),
    ("rise-2m", dict(D, dz=2)), ("drop-2m", dict(D, dz=-2)), ("zero-flow", dict(D, Q=0)),
    ("negative-p3", dict(D, Q=0.002, D2=0.015, L=100, p1=80000)), ("negative-p2", dict(D, Q=0.002, D2=0.015, K=10, p1=80000)),
    ("light-fluid", dict(D, rho=500, mu=0.0005)), ("expansion", dict(D, D1=0.03, D2=0.08)),
]
rng = random.Random(202611262)
for k in range(30):
    L = round(rng.uniform(0, 100), 1)
    c = {"Q": round(rng.uniform(0, 0.002), 5), "D1": round(rng.uniform(0.02, 0.1), 3), "D2": round(rng.uniform(0.015, 0.1), 3),
         "dz": round(rng.uniform(-min(2, L), min(2, L)), 2), "L": L, "eps": round(rng.uniform(0, 0.001), 6),
         "rho": round(rng.uniform(500, 1500)), "mu": round(rng.uniform(0.0005, 0.002) if k % 2 else rng.uniform(0.0005, 0.05), 4), "p1": round(rng.uniform(80000, 200000)),
         "K": round(rng.uniform(0, 10), 1)}
    named.append((f"random-{k:02d}", c))

pipe_cases = []
for name, c in named:
    o = pipe(c)
    pipe_cases.append({"name": name, "inputs": c,
                       "outputs": {k: (v if isinstance(v, str) else num(v)) for k, v in o.items()},
                       "fluids_f": (float(fluids_colebrook(float(o["Re2"]), float(M(c["eps"]) / M(c["D2"]))))
                                    if o["regime"] == "turbulent" and o["f"] is not None and o["Re2"] >= 4000 else None)})

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({
    "generator": "app/fixtures/generate_pipe_fixtures.py",
    "method": "mpmath 50-digit; Colebrook by findroot (Illinois bracket) on f; independent of the TypeScript",
    "mpmath": mp.__version__, "fluids": fluids.__version__,
    "s07": s07, "s04": s04_cases, "s04_hp_required": num(hp_req), "s08_colebrook": s08_points,
    "s08_spec": {"laminar_Re1000": num(M(64) / 1000), "smooth_Re1e5": num(colebrook_f(1e5, 0))},
    "pipe": pipe_cases,
}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"wrote {len(pipe_cases)} composite, {len(s08_points)} Colebrook, {len(s04_cases)} S04 fixtures; fluids {fluids.__version__}")
