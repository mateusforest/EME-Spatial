import numpy as np,sys
f=open(sys.argv[1],'rb');props=[];n=0
while True:
    l=f.readline().decode().strip()
    if l.startswith('element vertex'):n=int(l.split()[2])
    if l.startswith('property'):props.append(l.split()[2])
    if l=='end_header':break
d=np.frombuffer(f.read(n*4*len(props)),dtype=np.float32).reshape(n,len(props))
g=lambda k:d[:,props.index(k)]
a=1/(1+np.exp(-g('opacity')));keep=a>0.02
pos=np.stack([g('x'),g('y'),g('z')],1)
sc=np.exp(np.stack([g('scale_0'),g('scale_1'),g('scale_2')],1))
col=np.clip(np.stack([g('f_dc_0'),g('f_dc_1'),g('f_dc_2')],1)*0.28209479+0.5,0,1)
q=np.stack([g('rot_0'),g('rot_1'),g('rot_2'),g('rot_3')],1);q/=np.linalg.norm(q,axis=1,keepdims=True)
o=np.argsort(-(sc.prod(1)*a))
rec=np.zeros(n,dtype=[('p','<f4',3),('s','<f4',3),('c','u1',4),('r','u1',4)])
rec['p']=pos;rec['s']=sc;rec['c']=np.concatenate([col,a[:,None]],1)*255
rec['r']=np.clip(q*128+128,0,255)
rec=rec[o][keep[o]];rec.tofile(sys.argv[2]);print(n,len(rec),pos.min(0),pos.max(0))
