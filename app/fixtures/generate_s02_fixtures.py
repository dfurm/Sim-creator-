"""Independent S02 fixtures (Run 2A).

Written separately from the TypeScript model: arbitrary-precision arithmetic (mpmath,
50 significant digits) applied directly to the spec relations in spec/simulations/S02.md §C/§D:
    A = pi D^2 / 4,  v = Q / A,  mdot = rho Q,  rho = 1000 kg/m^3,
    D_min = sqrt(4 Q / (pi v_max)); feasible teaching bores are whole millimetres 10..100
    with D >= D_min (compared exactly, not via a velocity tolerance).
Inputs are SI. Output: app/tests/fixtures/S02.fixtures.json (values as float and as
50-digit strings). Run from the repo root:
    .venv/bin/python app/fixtures/generate_s02_fixtures.py
"""
import json
import random
from pathlib import Path

import mpmath as mp

mp.mp.dps = 50
RHO = mp.mpf(1000)
OUT = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "S02.fixtures.json"


def dec(x: str) -> mp.mpf:
    """Parse inputs from decimal strings so that e.g. 0.025 is the exact decimal value."""
    return mp.mpf(x)


def forward(Q: str, D1: str, D2: str) -> dict:
    q, d1, d2 = dec(Q), dec(D1), dec(D2)
    a1 = mp.pi * d1 ** 2 / 4
    a2 = mp.pi * d2 ** 2 / 4
    return {"area1": a1, "area2": a2, "v1": q / a1, "v2": q / a2, "mdot": RHO * q}


def design(Q: str, vmax: str) -> dict:
    q, vm = dec(Q), dec(vmax)
    dmin = mp.sqrt(4 * q / (mp.pi * vm))
    feasible_mm = [mm for mm in range(10, 101) if mp.mpf(mm) / 1000 >= dmin]
    status = "infeasible" if not feasible_mm else ("all-feasible" if len(feasible_mm) == 91 else "feasible")
    sel = feasible_mm[0] if feasible_mm else None
    v_sel = (q / (mp.pi * (mp.mpf(sel) / 1000) ** 2 / 4)) if sel is not None else None
    return {"Dmin": dmin, "feasible_mm": feasible_mm, "selected_mm": sel, "vAtSelected": v_sel, "status": status}


def num(x):
    return None if x is None else {"float": float(x), "exact": mp.nstr(x, 40)}


cases = []


def add(name, Q, D1, D2, note):
    out = forward(Q, D1, D2)
    cases.append({
        "name": name, "note": note,
        "inputs": {"Q": float(dec(Q)), "D1": float(dec(D1)), "D2": float(dec(D2))},
        "inputsExact": {"Q": Q, "D1": D1, "D2": D2},
        "outputs": {k: num(v) for k, v in out.items()},
    })


add("spec-default", "0.001", "0.05", "0.025", "spec S02 §M defaults: v1=.509296, v2=2.03718, mdot=1")
add("equal-diameters-50mm", "0.001", "0.05", "0.05", "equal diameters give equal mean speeds")
add("equal-diameters-10mm", "0.003", "0.01", "0.01", "equal diameters at range corner")
add("zero-flow", "0", "0.05", "0.025", "Q=0 gives zero at both stations")
add("halve-D2-before", "0.001", "0.05", "0.05", "investigate: before halving")
add("halve-D2-after", "0.001", "0.05", "0.025", "investigate: after halving, v2 x4")
add("expansion", "0.002", "0.02", "0.08", "D2 > D1 (expansion)")
for q in ("0", "0.003"):
    for d1 in ("0.01", "0.1"):
        for d2 in ("0.01", "0.1"):
            add(f"corner-Q{q}-D1{d1}-D2{d2}", q, d1, d2, "teaching-range corner")

rng = random.Random(20261126)
for k in range(25):
    q = f"{rng.randint(0, 300) * 1e-5:.5f}"
    d1 = f"{rng.randint(10, 100) / 1000:.3f}"
    d2 = f"{rng.randint(10, 100) / 1000:.3f}"
    add(f"random-{k:02d}", q, d1, d2, "seeded random on the control grid (seed 20261126)")

designs = []
for name, Q, vmax, note in [
    ("spec-default-cap", "0.001", "2", "spec §D: Dmin=.0252313 m"),
    ("infeasible", "0.003", "0.25", "Dmin above 100 mm"),
    ("zero-flow", "0", "2", "all bores feasible"),
    ("small-flow-high-cap", "0.0001", "4", "Dmin below 10 mm: all feasible"),
    ("mid", "0.002", "1.5", "general case"),
]:
    d = design(Q, vmax)
    designs.append({
        "name": name, "note": note, "inputs": {"Q": float(dec(Q)), "vmax": float(dec(vmax))},
        "Dmin": num(d["Dmin"]), "feasible_mm": d["feasible_mm"], "selected_mm": d["selected_mm"],
        "vAtSelected": num(d["vAtSelected"]), "status": d["status"],
    })

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({
    "generator": "app/fixtures/generate_s02_fixtures.py",
    "method": "mpmath 50-digit evaluation of spec S02 §C relations; independent of the TypeScript model",
    "mpmath": mp.__version__,
    "tolerance": {"rtol": 1e-12, "atol_note": "outputs exactly zero compared with atol 1e-15 of characteristic scale"},
    "forward": cases,
    "design": designs,
}, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"wrote {len(cases)} forward and {len(designs)} design fixtures to {OUT}")
