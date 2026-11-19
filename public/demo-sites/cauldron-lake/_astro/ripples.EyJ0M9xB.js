import{A as e,F as t,G as n,P as r,U as i,W as a,k as o,o as s,w as c,x as l,y as u}from"./three.module.l1fCDnU0.js";var d=`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,f=`
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;        // 1/size, scaled by aniso on y
uniform float uDamping;
uniform vec4 uDrops[4];     // x, y (uv), radius (uv), strength
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uState, vUv);
  float n = texture2D(uState, vUv + vec2(0.0, uTexel.y)).r;
  float s = texture2D(uState, vUv - vec2(0.0, uTexel.y)).r;
  float e = texture2D(uState, vUv + vec2(uTexel.x, 0.0)).r;
  float w = texture2D(uState, vUv - vec2(uTexel.x, 0.0)).r;
  float next = (n + s + e + w) * 0.5 - c.g;
  next *= uDamping;
  for (int i = 0; i < 4; i++) {
    vec4 d = uDrops[i];
    if (d.w == 0.0) continue;
    float r = length((vUv - d.xy) * vec2(1.0, uTexel.x / uTexel.y));
    next += d.w * exp(-r * r / (d.z * d.z));
  }
  // fade at the borders so waves don't reflect off the edges
  vec2 edge = smoothstep(0.0, 0.04, vUv) * smoothstep(0.0, 0.04, 1.0 - vUv);
  gl_FragColor = vec4(next * edge.x * edge.y, c.r, 0.0, 1.0);
}`,p=class{renderer;aniso;targets;scene=new r;camera=new s;material;mesh;drops=[new a,new a,new a,new a];dropCount=0;flip=0;width;height;constructor(r,a,s,p=1,m=.985){this.renderer=r,this.aniso=p,this.width=a,this.height=s;let h=()=>new n(a,s,{type:u,format:e,minFilter:l,magFilter:l,depthBuffer:!1,stencilBuffer:!1});this.targets=[h(),h()],this.material=new t({vertexShader:d,fragmentShader:f,uniforms:{uState:{value:null},uTexel:{value:new i(1/a,1/s*p)},uDamping:{value:m},uDrops:{value:this.drops}},depthTest:!1,depthWrite:!1}),this.mesh=new c(new o(2,2),this.material),this.scene.add(this.mesh);for(let e of this.targets)r.setRenderTarget(e),r.clear();r.setRenderTarget(null)}drop(e,t,n=.03,r=.6){this.dropCount>=this.drops.length||this.drops[this.dropCount++].set(e,t,n,r)}step(e=1){for(let t=0;t<e;t++){let e=this.targets[this.flip],n=this.targets[1-this.flip];if(this.material.uniforms.uState.value=e.texture,this.renderer.setRenderTarget(n),this.renderer.render(this.scene,this.camera),this.flip=1-this.flip,t===0){for(let e of this.drops)e.set(0,0,0,0);this.dropCount=0}}this.renderer.setRenderTarget(null)}get texture(){return this.targets[this.flip].texture}resize(e,t){if(e!==this.width||t!==this.height){this.width=e,this.height=t;for(let n of this.targets)n.setSize(e,t);this.material.uniforms.uTexel.value.set(1/e,1/t*this.aniso)}}dispose(){this.targets.forEach(e=>e.dispose()),this.material.dispose(),this.mesh.geometry.dispose()}};export{p as t};