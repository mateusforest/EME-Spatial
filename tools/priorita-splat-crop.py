import numpy as np,sys
dt=np.dtype([('p','<f4',3),('s','<f4',3),('c','u1',4),('r','u1',4)])
d=np.fromfile(sys.argv[1],dtype=dt).copy()
cx,cy=1.0,-34.0;R0,R1=float(sys.argv[3]),float(sys.argv[4])
p=d['p'];r=np.hypot(p[:,0]-cx,p[:,1]-cy)
d=d[r<R1];p=d['p'];r=np.hypot(p[:,0]-cx,p[:,1]-cy)
x=p[:,0];z=-p[:,1]
g=2.3*np.sin(x*.012)+3.1*np.sin(z*.011)+1.15*np.cos((x+z)*.018)+z*.008+(2.4*np.sin(.043*x+.021*z+1.1)+1.5*np.sin(-.027*x+.049*z+2.3)+.7*np.sin(.085*x-.05*z+.4)+.2*np.sin(.19*x+.13*z))
h=p[:,2]-g;smax=d['s'].max(1)
print('h pct',np.percentile(h,[1,50,90,99,99.9]),'smax pct',np.percentile(smax,[50,99,99.9]))
keep=(h>-25)&(h<float(sys.argv[5]))&~((smax>2.5)&(h>1.0))&(smax<8)
d=d[keep];r=r[keep]
f=np.clip((R1-r)/(R1-R0),0,1);d['c'][:,3]=(d['c'][:,3]*f*f*(3-2*f)).astype(np.uint8)
d=d[d['c'][:,3]>4];d.tofile(sys.argv[2]);print(len(d),'zmed centro',np.median(d['p'][np.hypot(d['p'][:,0]-cx,d['p'][:,1]-cy)<10,2]))
