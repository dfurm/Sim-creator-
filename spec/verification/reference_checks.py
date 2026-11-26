"""Independent reference calculations for the 28 starter briefs. Run with Python, NumPy and SciPy.
Each check compares a computed reference quantity with a declared, rounded fixture.
It checks the specification, not a browser implementation or real equipment."""
from math import pi, sqrt, exp, log, tanh
import json
import numpy as np
from scipy.integrate import quad, solve_ivp, solve_bvp
from scipy.optimize import brentq
from scipy.special import erfc
from pathlib import Path

results = []
def check(sim, quantity, computed, expected, tolerance, method):
    error = abs(computed - expected)
    results.append(dict(sim=f"S{sim:02d}", quantity=quantity, value=float(computed),
                        expected=expected, absolute_tolerance=tolerance, method=method,
                        passed=bool(error <= tolerance)))

g=9.80665
v1=.001/(pi*.05**2/4)
v2=.001/(pi*.025**2/4)
check(1,"Accumulation [m3]",quad(lambda t:.002+.00002*t,0,50)[0],.125,1e-10,"Quadrature of flow")
check(2,"Throat velocity [m/s]",v2,2.03718,5e-6,"Q / circle area")
check(3,"Gauge pressure [Pa]",quad(lambda z:1000*g,0,2)[0],19613.3,1e-7,"Integrate pressure gradient")
check(4,"Pressure change [Pa]",500*(v1*v1-v2*v2),-1945.37,.01,"Kinetic energy difference")
u=.00001/(pi*.01**2)
check(5,"Integrated flow [m3/s]",quad(lambda r:2*pi*r*2*u*(1-(r/.01)**2),0,.01)[0],.00001,1e-12,"Annular integral")
eta=np.linspace(0,14,240)
guess=np.vstack((eta-1+np.exp(-eta),1-np.exp(-eta),np.exp(-eta)))
def bl_rhs(x,y): return np.vstack((y[1],y[2],-.5*y[0]*y[2]))
bl=solve_bvp(bl_rhs,lambda ya,yb:[ya[0],ya[1],yb[1]-1],eta,guess,tol=1e-8)
assert bl.success
check(6,"Wall curvature",bl.y[2,0],.332057,2e-5,"Collocation BVP independent of prescribed shooting")
check(6,"99% thickness [m]",brentq(lambda e:bl.sol(e)[1]-.99,0,12)*sqrt(.000015*.3/2),.007365,2e-5,"Interpolate BVP solution")
check(7,"Pipe Reynolds",1000*.1*.02/.001,2000,1e-9,"Inertial/viscous scale ratio")
f=brentq(lambda f:1/sqrt(f)+2*np.log10(2.51/(100000*sqrt(f))),.006,.09)
check(8,"Smooth Darcy f at Re=100000",f,.0179898,1e-7,"Root in f instead of in 1/sqrt(f)")
q=brentq(lambda q:10-1e6*q*q-(2+1e6*q*q),0,.003)
check(9,"Operating flow [m3/s]",q,.002,1e-10,"Bracket intersection independently")
# S10 fixes the Darcy factor at .02 for the preliminary design benchmark.
head=2+(2+.02*20/.05)*v1*v1/(2*g)
check(10,"Head for fixed f=.02 [m]",head,2.13225,2e-5,"Sum entry/minor and major pressure losses")
check(11,"Composite flux [W/m2]",brentq(lambda q:333-q*.05/1-q*.05/.5-303,0,1000),200,1e-7,"Solve temperature residual")
check(12,"Cylindrical loss [W]",50/(quad(lambda r:1/(2*pi*.1*r),.005,.01)[0]+1/(2*pi*.01*10)),18.555,.001,"Integrate radial resistance")
check(13,"Lumped T at 200 s [K]",solve_ivp(lambda t,y:-(y-300)/200,[0,200],[350.],rtol=1e-10,atol=1e-11).y[0,-1],318.394,.001,"Integrate ODE")
check(14,"Plate mean Nu",quad(lambda x:.332*(2*x/.000015)**.5*.7**(1/3)/x,0,.3)[0],117.914,.002,"Integrate local heat transfer over area")
check(15,"Parallel duty [W]",1000*25*(1-exp(-2)),21616.6,.1,"Difference-temperature ODE integral")
check(16,"Countercurrent required area [m2]",brentq(lambda A:50000*(.5*A)/(1+.5*A)-25000,0,10),2,1e-10,"Invert forward effectiveness")
check(17,"Semi-infinite concentration at eta=1 [mol/m3]",100*erfc(1),15.7299,.0001,"Complementary error function")
check(18,"Tank level [m]",(.2*.5+(.002-.001)*60)/.2,.8,1e-12,"Inventory balance")
check(19,"CSTR step [mol/m3]",solve_ivp(lambda t,c:.01*(100-c)-.01*c,[0,50],[0.],rtol=1e-10,atol=1e-12).y[0,-1],31.606,.001,"Integrate balance")
check(20,"PFR design [m3]",quad(lambda x:.001/(.01*(1-x)),0,.5)[0],.0693147,1e-7,"Levenspiel quadrature")
check(21,"Rate at 310 K [1/s]",.01*exp(quad(lambda T:50000/(8.314462618*T*T),300,310)[0]),.01909088,1e-7,"Integrate logarithmic temperature derivative")
check(22,"Bubble pressure [Pa]",brentq(lambda p:100000/p+50000/p-1,1e5,2e5),150000,1e-6,"Normalise vapour mole fractions")
last=.8
stages=0
while stages<500:
    xx=brentq(lambda x:2*x/(1+x)-last,0,1)
    stages+=1
    if xx<=.2:break
    last=.75*xx+.2 if xx>=.5 else .2+1.25*(xx-.2)
check(23,"Contacts including reboiler",stages,6,0,"Numerical inversion of equilibrium at each step")
check(24,"Normalised filtrate volume [m]",brentq(lambda v:500*v*v+100*v-150,0,1),.456776,1e-6,"Implicit cake balance")
check(25,"First delivered sample PV",solve_ivp(lambda t,y:(1-y)/10,[0,.1],[0.],rtol=1e-11,atol=1e-13).y[0,-1],.00995017,1e-8,"Plant ODE under ZOH")
y=1
for _ in range(4):
    h=.5; a=-y; b=-(y+h*a/2); c=-(y+h*b/2); d=-(y+h*c)
    y+=h*(a+2*b+2*c+d)/6
check(26,"RK4 endpoint",y,.13554977,1e-8,"Explicit four-stage stepping")
x=np.arange(4); data=np.array([1,4,4,7]); slope,intercept=np.polyfit(x,data,1)
check(27,"OLS slope",slope,1.8,1e-12,"Independent polynomial least squares")
check(27,"OLS SSE",((data-intercept-slope*x)**2).sum(),1.8,1e-12,"Residual norm")
cov=np.diag([.001**2,.02**2]); jac=np.array([pi*.05/2,pi*.05**2/4])
check(28,"Relative combined uncertainty",sqrt(jac@cov@jac)/(pi*.05**2/4),.04472136,1e-8,"Covariance matrix product")
if __name__=="__main__":
    print(json.dumps(results,indent=2))
    if not all(row["passed"] for row in results): raise SystemExit(1)

