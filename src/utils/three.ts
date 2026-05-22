// ─── Mini Three.js-compatible WebGL Engine ───────────────────────────────────
// Implements the subset of Three.js API used by the 5 project planners
// (Deck, Garage, Shed, Roof, Kitchen) with real WebGL rendering.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Constants ───────────────────────────────────────────────────────────────
export const PCFSoftShadowMap = 2;
export const DoubleSide = 2;

// ─── Matrix Math (column-major Float32Array[16]) ─────────────────────────────
type Mat4 = Float32Array;

function mat4(): Mat4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const r = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
      r[i * 4 + j] = s;
    }
  return r;
}

function mat4Perspective(fovRad: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovRad / 2);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect; m[5] = f;
  m[10] = (far + near) * nf; m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}

function mat4LookAt(eye: Vector3, target: Vector3, up: Vector3): Mat4 {
  let zx = eye.x - target.x, zy = eye.y - target.y, zz = eye.z - target.z;
  let len = Math.sqrt(zx * zx + zy * zy + zz * zz) || 1;
  zx /= len; zy /= len; zz /= len;
  let xx = up.y * zz - up.z * zy, xy = up.z * zx - up.x * zz, xz = up.x * zy - up.y * zx;
  len = Math.sqrt(xx * xx + xy * xy + xz * xz) || 1;
  xx /= len; xy /= len; xz /= len;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  const m = new Float32Array(16);
  m[0] = xx; m[1] = yx; m[2] = zx;
  m[4] = xy; m[5] = yy; m[6] = zy;
  m[8] = xz; m[9] = yz; m[10] = zz;
  m[12] = -(xx * eye.x + xy * eye.y + xz * eye.z);
  m[13] = -(yx * eye.x + yy * eye.y + yz * eye.z);
  m[14] = -(zx * eye.x + zy * eye.y + zz * eye.z);
  m[15] = 1;
  return m;
}

function mat4Translate(x: number, y: number, z: number): Mat4 {
  const m = mat4();
  m[12] = x; m[13] = y; m[14] = z;
  return m;
}

function mat4RotateX(angle: number): Mat4 {
  const m = mat4();
  const c = Math.cos(angle), s = Math.sin(angle);
  m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
  return m;
}

function mat4RotateY(angle: number): Mat4 {
  const m = mat4();
  const c = Math.cos(angle), s = Math.sin(angle);
  m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
  return m;
}

function mat4RotateZ(angle: number): Mat4 {
  const m = mat4();
  const c = Math.cos(angle), s = Math.sin(angle);
  m[0] = c; m[1] = s; m[4] = -s; m[5] = c;
  return m;
}

function mat4NormalMatrix(model: Mat4): Mat4 {
  // Compute inverse transpose of upper-left 3x3 for normal transformation
  // For simplicity, compute full 4x4 inverse then transpose
  const a = model;
  const b00 = a[0]*a[5] - a[1]*a[4], b01 = a[0]*a[6] - a[2]*a[4];
  const b02 = a[0]*a[7] - a[3]*a[4], b03 = a[1]*a[6] - a[2]*a[5];
  const b04 = a[1]*a[7] - a[3]*a[5], b05 = a[2]*a[7] - a[3]*a[6];
  const b06 = a[8]*a[13] - a[9]*a[12], b07 = a[8]*a[14] - a[10]*a[12];
  const b08 = a[8]*a[15] - a[11]*a[12], b09 = a[9]*a[14] - a[10]*a[13];
  const b10 = a[9]*a[15] - a[11]*a[13], b11 = a[10]*a[15] - a[11]*a[14];
  let det = b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06;
  if (!det) return mat4();
  det = 1 / det;
  const inv = new Float32Array(16);
  inv[0] = (a[5]*b11 - a[6]*b10 + a[7]*b09)*det;
  inv[1] = (a[2]*b10 - a[1]*b11 - a[3]*b09)*det;
  inv[2] = (a[13]*b05 - a[14]*b04 + a[15]*b03)*det;
  inv[3] = (a[10]*b04 - a[9]*b05 - a[11]*b03)*det;
  inv[4] = (a[6]*b08 - a[4]*b11 - a[7]*b07)*det;
  inv[5] = (a[0]*b11 - a[2]*b08 + a[3]*b07)*det;
  inv[6] = (a[14]*b02 - a[12]*b05 - a[15]*b01)*det;
  inv[7] = (a[8]*b05 - a[10]*b02 + a[11]*b01)*det;
  inv[8] = (a[4]*b10 - a[5]*b08 + a[7]*b06)*det;
  inv[9] = (a[1]*b08 - a[0]*b10 - a[3]*b06)*det;
  inv[10] = (a[12]*b04 - a[13]*b02 + a[15]*b00)*det;
  inv[11] = (a[9]*b02 - a[8]*b04 - a[11]*b00)*det;
  inv[12] = (a[5]*b07 - a[4]*b09 - a[6]*b06)*det;
  inv[13] = (a[0]*b09 - a[1]*b07 + a[2]*b06)*det;
  inv[14] = (a[13]*b01 - a[12]*b03 - a[14]*b00)*det;
  inv[15] = (a[8]*b03 - a[9]*b01 + a[10]*b00)*det;
  // Transpose
  const t = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      t[i*4+j] = inv[j*4+i];
  return t;
}

// ─── Vector3 ─────────────────────────────────────────────────────────────────
export class Vector3 {
  x: number; y: number; z: number;
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v: Vector3) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
}

// ─── Color ───────────────────────────────────────────────────────────────────
export class Color {
  r: number; g: number; b: number;
  constructor(hex: number = 0) {
    this.r = ((hex >> 16) & 0xff) / 255;
    this.g = ((hex >> 8) & 0xff) / 255;
    this.b = (hex & 0xff) / 255;
  }
  set(hex: number) {
    this.r = ((hex >> 16) & 0xff) / 255;
    this.g = ((hex >> 8) & 0xff) / 255;
    this.b = (hex & 0xff) / 255;
    return this;
  }
}

// ─── Fog ─────────────────────────────────────────────────────────────────────
export class Fog {
  color: Color; near: number; far: number;
  constructor(color: number, near: number, far: number) {
    this.color = new Color(color); this.near = near; this.far = far;
  }
}

// ─── Geometry Data ───────────────────────────────────────────────────────────
interface GeometryData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
}

interface LineGeometryData {
  positions: Float32Array;
  isLines: true;
}

// ─── BufferAttribute / BufferGeometry ────────────────────────────────────────
export class BufferAttribute {
  array: Float32Array; itemSize: number;
  constructor(array: Float32Array, itemSize: number) {
    this.array = array; this.itemSize = itemSize;
  }
}

export class BufferGeometry {
  _positions: Float32Array | null = null;
  _normals: Float32Array | null = null;
  _uvs: Float32Array | null = null;
  _indices: Uint16Array | null = null;
  _isLines = false;
  boundingBox: { min: Vector3, max: Vector3 } | null = null;

  setAttribute(name: string, attr: BufferAttribute) {
    if (name === 'position') this._positions = attr.array;
    else if (name === 'normal') this._normals = attr.array;
    else if (name === 'uv') this._uvs = attr.array;
    return this;
  }

  setIndex(indices: number[]) {
    this._indices = new Uint16Array(indices);
    return this;
  }

  computeBoundingBox() {
    if (!this._positions) {
      this.boundingBox = { min: new Vector3(), max: new Vector3() };
      return;
    }
    const pos = this._positions;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], y = pos[i+1], z = pos[i+2];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
    this.boundingBox = {
      min: new Vector3(minX, minY, minZ),
      max: new Vector3(maxX, maxY, maxZ)
    };
  }

  center() {
    this.computeBoundingBox();
    if (!this.boundingBox || !this._positions) return;
    const offset = new Vector3(
      -(this.boundingBox.max.x + this.boundingBox.min.x) / 2,
      -(this.boundingBox.max.y + this.boundingBox.min.y) / 2,
      -(this.boundingBox.max.z + this.boundingBox.min.z) / 2
    );
    for (let i = 0; i < this._positions.length; i += 3) {
      this._positions[i] += offset.x;
      this._positions[i+1] += offset.y;
      this._positions[i+2] += offset.z;
    }
    this.computeBoundingBox(); // Recompute
  }

  computeVertexNormals() {
    if (!this._positions) return;
    const pos = this._positions;
    const count = pos.length / 3;
    const normals = new Float32Array(count * 3);

    // If we have indices, use them; otherwise treat as non-indexed triangles
    if (this._indices) {
      const idx = this._indices;
      for (let i = 0; i < idx.length; i += 3) {
        const a = idx[i], b = idx[i+1], c = idx[i+2];
        const ax = pos[a*3], ay = pos[a*3+1], az = pos[a*3+2];
        const bx = pos[b*3], by = pos[b*3+1], bz = pos[b*3+2];
        const cx = pos[c*3], cy = pos[c*3+1], cz = pos[c*3+2];
        const ex = bx-ax, ey = by-ay, ez = bz-az;
        const fx = cx-ax, fy = cy-ay, fz = cz-az;
        const nx = ey*fz - ez*fy, ny = ez*fx - ex*fz, nz = ex*fy - ey*fx;
        for (const v of [a,b,c]) { normals[v*3] += nx; normals[v*3+1] += ny; normals[v*3+2] += nz; }
      }
    } else {
      // Non-indexed: every 3 vertices is a triangle
      for (let i = 0; i < count; i += 3) {
        const ax = pos[i*3], ay = pos[i*3+1], az = pos[i*3+2];
        const bx = pos[(i+1)*3], by = pos[(i+1)*3+1], bz = pos[(i+1)*3+2];
        const cx = pos[(i+2)*3], cy = pos[(i+2)*3+1], cz = pos[(i+2)*3+2];
        const ex = bx-ax, ey = by-ay, ez = bz-az;
        const fx = cx-ax, fy = cy-ay, fz = cz-az;
        const nx = ey*fz - ez*fy, ny = ez*fx - ex*fz, nz = ex*fy - ey*fx;
        for (const v of [i,i+1,i+2]) { normals[v*3] += nx; normals[v*3+1] += ny; normals[v*3+2] += nz; }
      }
    }

    // Normalize
    for (let i = 0; i < count; i++) {
      const x = normals[i*3], y = normals[i*3+1], z = normals[i*3+2];
      const len = Math.sqrt(x*x + y*y + z*z) || 1;
      normals[i*3] /= len; normals[i*3+1] /= len; normals[i*3+2] /= len;
    }
    this._normals = normals;
  }

  _getGeoData(): GeometryData | LineGeometryData | null {
    if (this._isLines && this._positions) {
      return { positions: this._positions, isLines: true as const };
    }
    if (!this._positions) return null;
    const count = this._positions.length / 3;
    if (!this._normals) {
      this.computeVertexNormals();
    }
    if (!this._indices) {
      // Create sequential indices for non-indexed geometry
      const idx = new Uint16Array(count);
      for (let i = 0; i < count; i++) idx[i] = i;
      this._indices = idx;
    }
    return {
      positions: this._positions,
      normals: this._normals || new Float32Array(count * 3),
      uvs: this._uvs || new Float32Array(count * 2),
      indices: this._indices,
    };
  }

  clone(): BufferGeometry {
    const g = new BufferGeometry();
    if (this._positions) g._positions = new Float32Array(this._positions);
    if (this._normals) g._normals = new Float32Array(this._normals);
    if (this._uvs) g._uvs = new Float32Array(this._uvs);
    if (this._indices) g._indices = new Uint16Array(this._indices);
    g._isLines = this._isLines;
    return g;
  }

  translate(x: number, y: number, z: number) {
    if (!this._positions) return;
    for (let i = 0; i < this._positions.length; i += 3) {
      this._positions[i] += x;
      this._positions[i + 1] += y;
      this._positions[i + 2] += z;
    }
  }

  rotateX(angle: number) {
    if (!this._positions) return;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    for (let i = 0; i < this._positions.length; i += 3) {
      const y = this._positions[i + 1];
      const z = this._positions[i + 2];
      this._positions[i + 1] = y * c - z * s;
      this._positions[i + 2] = y * s + z * c;
      
      if (this._normals && this._normals.length > i + 2) {
        const ny = this._normals[i + 1];
        const nz = this._normals[i + 2];
        this._normals[i + 1] = ny * c - nz * s;
        this._normals[i + 2] = ny * s + nz * c;
      }
    }
  }
}

export class Shape {
  path: {x: number, y: number}[] = [];
  moveTo(x: number, y: number) { this.path.push({x, y}); }
  lineTo(x: number, y: number) { this.path.push({x, y}); }
}

export class ExtrudeGeometry extends BufferGeometry {
  constructor(shape: Shape, options: any) {
    super();
    const depth = options.depth || 1;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    shape.path.forEach(pt => {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    });
    
    if (minX === Infinity) { minX = 0; maxX = 1; minY = 0; maxY = 1; }
    
    const w = Math.max(0.01, maxX - minX);
    const h = Math.max(0.01, maxY - minY);
    
    // Instead of importing BoxGeometry, build standard Box arrays internally:
    const hw = w/2, hh = h/2, hd = depth/2;
    const p = new Float32Array(72); const n = new Float32Array(72);
    const u = new Float32Array(48); const idx = new Uint16Array(36);
    let vi = 0, ui = 0, ii = 0;
    const addF = (ax:number,ay:number,az:number, bx:number,by:number,bz:number, cx:number,cy:number,cz:number, dx:number,dy:number,dz:number, nx:number,ny:number,nz:number) => {
      const b = vi/3; p[vi++]=ax; p[vi++]=ay; p[vi++]=az; p[vi++]=bx; p[vi++]=by; p[vi++]=bz;
      p[vi++]=cx; p[vi++]=cy; p[vi++]=cz; p[vi++]=dx; p[vi++]=dy; p[vi++]=dz;
      for(let i=0;i<4;i++){ n[b*3+i*3]=nx; n[b*3+i*3+1]=ny; n[b*3+i*3+2]=nz; }
      u[ui++]=0; u[ui++]=0; u[ui++]=1; u[ui++]=0; u[ui++]=1; u[ui++]=1; u[ui++]=0; u[ui++]=1;
      idx[ii++]=b; idx[ii++]=b+1; idx[ii++]=b+2; idx[ii++]=b; idx[ii++]=b+2; idx[ii++]=b+3;
    };
    addF(-hw,-hh,hd, hw,-hh,hd, hw,hh,hd, -hw,hh,hd, 0,0,1);
    addF(hw,-hh,-hd, -hw,-hh,-hd, -hw,hh,-hd, hw,hh,-hd, 0,0,-1);
    addF(-hw,hh,hd, hw,hh,hd, hw,hh,-hd, -hw,hh,-hd, 0,1,0);
    addF(-hw,-hh,-hd, hw,-hh,-hd, hw,-hh,hd, -hw,-hh,hd, 0,-1,0);
    addF(hw,-hh,hd, hw,-hh,-hd, hw,hh,-hd, hw,hh,hd, 1,0,0);
    addF(-hw,-hh,-hd, -hw,-hh,hd, -hw,hh,hd, -hw,hh,-hd, -1,0,0);
    
    this._positions = p; this._normals = n; this._uvs = u; this._indices = idx;
    
    // Roughly align to shape bounding box coordinates
    this.translate(minX + w/2, minY + h/2, depth/2);
  }
}

// ─── BoxGeometry ─────────────────────────────────────────────────────────────
export class BoxGeometry extends BufferGeometry {
  constructor(w = 1, h = 1, d = 1) {
    super();
    const hw = w/2, hh = h/2, hd = d/2;
    this._buildBox(hw, hh, hd);
  }

  private _buildBox(hw: number, hh: number, hd: number) {
    const p = new Float32Array(72); // 24 verts * 3
    const n = new Float32Array(72);
    const u = new Float32Array(48); // 24 verts * 2
    const idx = new Uint16Array(36); // 6 faces * 6 indices

    let vi = 0, ui = 0, ii = 0;
    const addFace = (
      ax: number,ay: number,az: number, bx: number,by: number,bz: number,
      cx: number,cy: number,cz: number, dx: number,dy: number,dz: number,
      nx: number,ny: number,nz: number
    ) => {
      const base = vi / 3;
      p[vi++]=ax; p[vi++]=ay; p[vi++]=az;
      p[vi++]=bx; p[vi++]=by; p[vi++]=bz;
      p[vi++]=cx; p[vi++]=cy; p[vi++]=cz;
      p[vi++]=dx; p[vi++]=dy; p[vi++]=dz;
      for (let i=0;i<4;i++) { n[base*3+i*3]=nx; n[base*3+i*3+1]=ny; n[base*3+i*3+2]=nz; }
      u[ui++]=0; u[ui++]=0; u[ui++]=1; u[ui++]=0;
      u[ui++]=1; u[ui++]=1; u[ui++]=0; u[ui++]=1;
      idx[ii++]=base; idx[ii++]=base+1; idx[ii++]=base+2;
      idx[ii++]=base; idx[ii++]=base+2; idx[ii++]=base+3;
    };

    // +Z
    addFace(-hw,-hh,hd, hw,-hh,hd, hw,hh,hd, -hw,hh,hd, 0,0,1);
    // -Z
    addFace(hw,-hh,-hd, -hw,-hh,-hd, -hw,hh,-hd, hw,hh,-hd, 0,0,-1);
    // +Y
    addFace(-hw,hh,hd, hw,hh,hd, hw,hh,-hd, -hw,hh,-hd, 0,1,0);
    // -Y
    addFace(-hw,-hh,-hd, hw,-hh,-hd, hw,-hh,hd, -hw,-hh,hd, 0,-1,0);
    // +X
    addFace(hw,-hh,hd, hw,-hh,-hd, hw,hh,-hd, hw,hh,hd, 1,0,0);
    // -X
    addFace(-hw,-hh,-hd, -hw,-hh,hd, -hw,hh,hd, -hw,hh,-hd, -1,0,0);

    this._positions = p;
    this._normals = n;
    this._uvs = u;
    this._indices = idx;
  }
}

// ─── PlaneGeometry ───────────────────────────────────────────────────────────
export class PlaneGeometry extends BufferGeometry {
  constructor(w = 1, h = 1) {
    super();
    const hw = w/2, hh = h/2;
    // Three.js convention: plane on XY plane, normal = +Z
    this._positions = new Float32Array([
      -hw,-hh,0, hw,-hh,0, hw,hh,0, -hw,hh,0
    ]);
    this._normals = new Float32Array([0,0,1, 0,0,1, 0,0,1, 0,0,1]);
    this._uvs = new Float32Array([0,0, 1,0, 1,1, 0,1]);
    this._indices = new Uint16Array([0,1,2, 0,2,3]);
  }
}

// ─── CylinderGeometry ────────────────────────────────────────────────────────
export class CylinderGeometry extends BufferGeometry {
  constructor(radiusTop = 1, radiusBottom = 1, height = 1, radialSegments = 16) {
    super();
    const segs = Math.max(3, radialSegments);
    const hh = height / 2;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Side
    const sideBase = 0;
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const cos = Math.cos(a), sin = Math.sin(a);
      // Bottom vertex
      positions.push(cos * radiusBottom, -hh, sin * radiusBottom);
      normals.push(cos, 0, sin);
      uvs.push(i / segs, 0);
      // Top vertex
      positions.push(cos * radiusTop, hh, sin * radiusTop);
      normals.push(cos, 0, sin);
      uvs.push(i / segs, 1);
    }
    for (let i = 0; i < segs; i++) {
      const a = sideBase + i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, c, b, b, c, d);
    }

    // Top cap
    const topCenter = positions.length / 3;
    positions.push(0, hh, 0);
    normals.push(0, 1, 0);
    uvs.push(0.5, 0.5);
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      positions.push(Math.cos(a) * radiusTop, hh, Math.sin(a) * radiusTop);
      normals.push(0, 1, 0);
      uvs.push(Math.cos(a) * 0.5 + 0.5, Math.sin(a) * 0.5 + 0.5);
    }
    for (let i = 0; i < segs; i++) {
      indices.push(topCenter, topCenter + 1 + i, topCenter + 2 + i);
    }

    // Bottom cap
    const botCenter = positions.length / 3;
    positions.push(0, -hh, 0);
    normals.push(0, -1, 0);
    uvs.push(0.5, 0.5);
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      positions.push(Math.cos(a) * radiusBottom, -hh, Math.sin(a) * radiusBottom);
      normals.push(0, -1, 0);
      uvs.push(Math.cos(a) * 0.5 + 0.5, Math.sin(a) * 0.5 + 0.5);
    }
    for (let i = 0; i < segs; i++) {
      indices.push(botCenter, botCenter + 2 + i, botCenter + 1 + i);
    }

    this._positions = new Float32Array(positions);
    this._normals = new Float32Array(normals);
    this._uvs = new Float32Array(uvs);
    this._indices = new Uint16Array(indices);
  }
}

// ─── EdgesGeometry ───────────────────────────────────────────────────────────
export class EdgesGeometry extends BufferGeometry {
  constructor(geometry: BufferGeometry) {
    super();
    this._isLines = true;
    const geo = geometry._getGeoData();
    if (!geo || 'isLines' in geo) {
      this._positions = new Float32Array(0);
      return;
    }
    const pos = geo.positions;
    const idx = geo.indices;
    const edgeSet = new Set<string>();
    const linePositions: number[] = [];

    const key = (a: number, b: number) => {
      const min = Math.min(a, b), max = Math.max(a, b);
      // Use quantized positions as key for edge dedup
      const ax = Math.round(pos[min*3]*1000), ay = Math.round(pos[min*3+1]*1000), az = Math.round(pos[min*3+2]*1000);
      const bx = Math.round(pos[max*3]*1000), by = Math.round(pos[max*3+1]*1000), bz = Math.round(pos[max*3+2]*1000);
      return `${ax},${ay},${az}|${bx},${by},${bz}`;
    };

    // Collect face normals for each edge
    const edgeNormals = new Map<string, number[][]>();
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i], b = idx[i+1], c = idx[i+2];
      // Compute face normal
      const ax = pos[a*3], ay = pos[a*3+1], az = pos[a*3+2];
      const bx = pos[b*3], by = pos[b*3+1], bz = pos[b*3+2];
      const cx = pos[c*3], cy = pos[c*3+1], cz = pos[c*3+2];
      const ex = bx-ax, ey = by-ay, ez = bz-az;
      const fx = cx-ax, fy = cy-ay, fz = cz-az;
      const nx = ey*fz - ez*fy, ny = ez*fx - ex*fz, nz = ex*fy - ey*fx;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
      const fn = [nx/len, ny/len, nz/len];

      const edges = [[a,b],[b,c],[c,a]];
      for (const [ea, eb] of edges) {
        const k = key(ea, eb);
        if (!edgeNormals.has(k)) edgeNormals.set(k, []);
        edgeNormals.get(k)!.push(fn);
      }
    }

    // Only include edges where the angle between adjacent faces > threshold (hard edges)
    const threshold = Math.cos(1); // ~1 radian ≈ 57° threshold
    for (const [k, faceNorms] of edgeNormals) {
      let isEdge = faceNorms.length === 1; // boundary edge
      if (faceNorms.length >= 2) {
        const dot = faceNorms[0][0]*faceNorms[1][0] + faceNorms[0][1]*faceNorms[1][1] + faceNorms[0][2]*faceNorms[1][2];
        isEdge = dot < threshold;
      }
      if (isEdge && !edgeSet.has(k)) {
        edgeSet.add(k);
        const parts = k.split('|');
        const [ax,ay,az] = parts[0].split(',').map(Number);
        const [bx,by,bz] = parts[1].split(',').map(Number);
        linePositions.push(ax/1000, ay/1000, az/1000, bx/1000, by/1000, bz/1000);
      }
    }

    this._positions = new Float32Array(linePositions);
  }
}

// ─── CanvasTexture ───────────────────────────────────────────────────────────
export class CanvasTexture {
  _canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement) { this._canvas = canvas; }
}

// ─── Materials ───────────────────────────────────────────────────────────────
export class MeshStandardMaterial {
  color: Color;
  roughness: number;
  metalness: number;
  side: number;
  map: CanvasTexture | null;
  transparent: boolean;
  _isLine = false;

  constructor(opts: { color?: number; roughness?: number; metalness?: number; side?: number; map?: CanvasTexture; transparent?: boolean } = {}) {
    this.color = new Color(opts.color ?? 0xffffff);
    this.roughness = opts.roughness ?? 0.5;
    this.metalness = opts.metalness ?? 0;
    this.side = opts.side ?? 0;
    this.map = opts.map ?? null;
    this.transparent = opts.transparent ?? false;
  }
}

export class MeshBasicMaterial {
  color: Color;
  map: CanvasTexture | null;
  transparent: boolean;
  side: number;
  _isLine = false;
  _isBasic = true;
  roughness = 1;
  metalness = 0;

  constructor(opts: { color?: number; map?: CanvasTexture; transparent?: boolean; side?: number } = {}) {
    this.color = new Color(opts.color ?? 0xffffff);
    this.map = opts.map ?? null;
    this.transparent = opts.transparent ?? false;
    this.side = opts.side ?? 0;
  }
}

export class LineBasicMaterial {
  color: Color;
  linewidth: number;
  _isLine = true;

  constructor(opts: { color?: number; linewidth?: number } = {}) {
    this.color = new Color(opts.color ?? 0x000000);
    this.linewidth = opts.linewidth ?? 1;
  }
}

// ─── Object3D base ───────────────────────────────────────────────────────────
export class Object3D {
  position = new Vector3();
  rotation = { x: 0, y: 0, z: 0 };
  scale = new Vector3(1, 1, 1);
  children: Object3D[] = [];
  parent: Object3D | null = null;
  castShadow = false;
  receiveShadow = false;
  _type = 'Object3D';

  add(child: Object3D) { 
    child.parent = this;
    this.children.push(child); 
  }

  _getModelMatrix(): Mat4 {
    let m = mat4Translate(this.position.x, this.position.y, this.position.z);
    if (this.rotation.y !== 0) m = mat4Multiply(m, mat4RotateY(this.rotation.y));
    if (this.rotation.x !== 0) m = mat4Multiply(m, mat4RotateX(this.rotation.x));
    if (this.rotation.z !== 0) m = mat4Multiply(m, mat4RotateZ(this.rotation.z));
    if (this.scale.x !== 1 || this.scale.y !== 1 || this.scale.z !== 1) {
      const s = mat4();
      s[0] = this.scale.x; s[5] = this.scale.y; s[10] = this.scale.z;
      m = mat4Multiply(m, s);
    }
    if (this.parent) {
      m = mat4Multiply(this.parent._getModelMatrix(), m);
    }
    return m;
  }
}

// ─── Scene ───────────────────────────────────────────────────────────────────
export class Scene extends Object3D {
  background: Color | null = null;
  fog: Fog | null = null;
  _type = 'Scene' as const;
}

// ─── Camera ──────────────────────────────────────────────────────────────────
export class PerspectiveCamera extends Object3D {
  fov: number; aspect: number; near: number; far: number;
  _projMatrix: Mat4;
  _target = new Vector3();
  _type = 'Camera' as const;

  constructor(fov = 50, aspect = 1, near = 0.1, far = 2000) {
    super();
    this.fov = fov; this.aspect = aspect; this.near = near; this.far = far;
    this._projMatrix = mat4Perspective(fov * Math.PI / 180, aspect, near, far);
  }

  lookAt(x: number | Vector3, y?: number, z?: number) {
    if (x instanceof Vector3) { this._target.copy(x); }
    else { this._target.set(x, y ?? 0, z ?? 0); }
  }

  updateProjectionMatrix() {
    this._projMatrix = mat4Perspective(this.fov * Math.PI / 180, this.aspect, this.near, this.far);
  }

  _getViewMatrix(): Mat4 {
    return mat4LookAt(this.position, this._target, new Vector3(0, 1, 0));
  }
}

// ─── Lights ──────────────────────────────────────────────────────────────────
export class AmbientLight extends Object3D {
  color: Color; intensity: number;
  _type = 'AmbientLight' as const;
  shadow = { mapSize: { width: 512, height: 512 }, camera: { near: 0.5, far: 50, left: -20, right: 20, top: 20, bottom: -20 } };

  constructor(color = 0xffffff, intensity = 1) {
    super(); this.color = new Color(color); this.intensity = intensity;
  }
}

export class DirectionalLight extends Object3D {
  color: Color; intensity: number;
  _type = 'DirectionalLight' as const;
  shadow = { mapSize: { width: 512, height: 512 }, camera: { near: 0.5, far: 50, left: -20, right: 20, top: 20, bottom: -20 } };

  constructor(color = 0xffffff, intensity = 1) {
    super(); this.color = new Color(color); this.intensity = intensity;
  }
}

// ─── Mesh ────────────────────────────────────────────────────────────────────
export class Mesh extends Object3D {
  geometry: BufferGeometry;
  material: MeshStandardMaterial | MeshBasicMaterial;
  _type = 'Mesh' as const;

  constructor(geometry: BufferGeometry, material: MeshStandardMaterial | MeshBasicMaterial) {
    super(); this.geometry = geometry; this.material = material;
  }
}

// ─── LineSegments ────────────────────────────────────────────────────────────
export class LineSegments extends Object3D {
  geometry: BufferGeometry;
  material: LineBasicMaterial;
  _type = 'LineSegments' as const;

  constructor(geometry: BufferGeometry, material: LineBasicMaterial) {
    super(); this.geometry = geometry; this.material = material;
  }
}

// ─── GridHelper ──────────────────────────────────────────────────────────────
export class GridHelper extends Object3D {
  _geometry: BufferGeometry;
  _material: LineBasicMaterial;
  _type = 'GridHelper' as const;

  constructor(size = 10, divisions = 10, color1 = 0x444444, color2 = 0x888888) {
    super();
    const half = size / 2;
    const step = size / divisions;
    const positions: number[] = [];

    for (let i = 0; i <= divisions; i++) {
      const p = -half + i * step;
      positions.push(p, 0, -half, p, 0, half);
      positions.push(-half, 0, p, half, 0, p);
    }

    this._geometry = new BufferGeometry();
    this._geometry._positions = new Float32Array(positions);
    this._geometry._isLines = true;
    this._material = new LineBasicMaterial({ color: color1 });
  }
}

// ─── WebGL Shaders ───────────────────────────────────────────────────────────
const MESH_VS = `
  attribute vec3 aPos;
  attribute vec3 aNorm;
  attribute vec2 aUV;
  uniform mat4 uModel;
  uniform mat4 uView;
  uniform mat4 uProj;
  uniform mat4 uNormalMat;
  varying vec3 vNorm;
  varying vec3 vWorldPos;
  varying vec2 vUV;
  varying float vDist;
  void main() {
    vec4 worldPos = uModel * vec4(aPos, 1.0);
    vWorldPos = worldPos.xyz;
    vNorm = normalize((uNormalMat * vec4(aNorm, 0.0)).xyz);
    vUV = aUV;
    vec4 viewPos = uView * worldPos;
    vDist = -viewPos.z;
    gl_Position = uProj * viewPos;
  }
`;

const MESH_FS = `
  precision mediump float;
  uniform vec3 uColor;
  uniform vec3 uAmbient;
  uniform vec3 uLightDir;
  uniform vec3 uLightColor;
  uniform float uLightIntensity;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3 uFogColor;
  uniform bool uUseFog;
  uniform bool uUseTexture;
  uniform bool uIsBasic;
  uniform sampler2D uTexture;
  uniform bool uTransparent;
  varying vec3 vNorm;
  varying vec3 vWorldPos;
  varying vec2 vUV;
  varying float vDist;
  void main() {
    vec3 baseColor = uColor;
    float alpha = 1.0;
    if (uUseTexture) {
      vec4 texColor = texture2D(uTexture, vUV);
      baseColor = texColor.rgb;
      alpha = texColor.a;
      if (uTransparent && alpha < 0.01) discard;
    }
    if (uIsBasic) {
      gl_FragColor = vec4(baseColor, alpha);
    } else {
      vec3 normal = normalize(vNorm);
      // Two-sided lighting
      float diff = max(dot(normal, uLightDir), 0.0);
      float diff2 = max(dot(-normal, uLightDir), 0.0);
      diff = max(diff, diff2);
      vec3 lighting = uAmbient + uLightColor * uLightIntensity * diff;
      vec3 color = baseColor * lighting;
      // Fog
      if (uUseFog) {
        float fogFactor = clamp((uFogFar - vDist) / (uFogFar - uFogNear), 0.0, 1.0);
        color = mix(uFogColor, color, fogFactor);
      }
      gl_FragColor = vec4(color, alpha);
    }
  }
`;

const LINE_VS = `
  attribute vec3 aPos;
  uniform mat4 uMVP;
  void main() {
    gl_Position = uMVP * vec4(aPos, 1.0);
  }
`;

const LINE_FS = `
  precision mediump float;
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor, 1.0);
  }
`;

function compileShader(gl: WebGLRenderingContext, src: string, type: number): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // console statement removed
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compileShader(gl, vsSrc, gl.VERTEX_SHADER));
  gl.attachShader(prog, compileShader(gl, fsSrc, gl.FRAGMENT_SHADER));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    // console statement removed
  }
  return prog;
}

// ─── WebGLRenderer ───────────────────────────────────────────────────────────
export class WebGLRenderer {
  domElement: HTMLCanvasElement;
  shadowMap = { enabled: false, type: 0 };
  private gl: WebGLRenderingContext;
  private meshProg: WebGLProgram;
  private lineProg: WebGLProgram;
  private _pixelRatio = 1;
  private _width = 300;
  private _height = 150;
  // Cached GL buffers
  private _bufferCache = new WeakMap<BufferGeometry, { vao: any; posB: WebGLBuffer; normB: WebGLBuffer | null; uvB: WebGLBuffer | null; idxB: WebGLBuffer | null; count: number; isLines: boolean }>();
  private _textureCache = new WeakMap<CanvasTexture, WebGLTexture>();

  constructor(opts: { antialias?: boolean; preserveDrawingBuffer?: boolean } = {}) {
    const canvas = document.createElement('canvas');
    this.domElement = canvas;
    const glOpts = { antialias: opts.antialias ?? true, preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false, alpha: false };
    const gl = (canvas.getContext('webgl', glOpts) || canvas.getContext('experimental-webgl', glOpts)) as WebGLRenderingContext;
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    this.meshProg = createProgram(gl, MESH_VS, MESH_FS);
    this.lineProg = createProgram(gl, LINE_VS, LINE_FS);
  }

  setSize(w: number, h: number) {
    this._width = w; this._height = h;
    this.domElement.width = w * this._pixelRatio;
    this.domElement.height = h * this._pixelRatio;
    this.domElement.style.width = w + 'px';
    this.domElement.style.height = h + 'px';
    this.gl.viewport(0, 0, this.domElement.width, this.domElement.height);
  }

  setPixelRatio(r: number) {
    this._pixelRatio = r;
    this.setSize(this._width, this._height);
  }

  private _getOrCreateBuffers(geometry: BufferGeometry) {
    let cached = this._bufferCache.get(geometry);
    if (cached) return cached;

    const gl = this.gl;
    const geoData = geometry._getGeoData();
    if (!geoData) return null;

    const posB = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posB);
    gl.bufferData(gl.ARRAY_BUFFER, geoData.positions, gl.STATIC_DRAW);

    let normB: WebGLBuffer | null = null;
    let uvB: WebGLBuffer | null = null;
    let idxB: WebGLBuffer | null = null;
    let count: number;
    const isLines = 'isLines' in geoData;

    if (!isLines) {
      normB = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, normB);
      gl.bufferData(gl.ARRAY_BUFFER, (geoData as GeometryData).normals, gl.STATIC_DRAW);

      uvB = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, uvB);
      gl.bufferData(gl.ARRAY_BUFFER, (geoData as GeometryData).uvs, gl.STATIC_DRAW);

      idxB = gl.createBuffer()!;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxB);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, (geoData as GeometryData).indices, gl.STATIC_DRAW);
      count = (geoData as GeometryData).indices.length;
    } else {
      count = geoData.positions.length / 3;
    }

    cached = { vao: null, posB, normB, uvB, idxB, count, isLines };
    this._bufferCache.set(geometry, cached);
    return cached;
  }

  private _getOrCreateTexture(tex: CanvasTexture): WebGLTexture {
    let glTex = this._textureCache.get(tex);
    if (glTex) return glTex;
    const gl = this.gl;
    glTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, glTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex._canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this._textureCache.set(tex, glTex);
    return glTex;
  }

  render(scene: Scene, camera: PerspectiveCamera) {
    const gl = this.gl;

    // Clear
    const bg = scene.background;
    if (bg) gl.clearColor(bg.r, bg.g, bg.b, 1);
    else gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const viewMat = camera._getViewMatrix();
    const projMat = camera._projMatrix;

    // Collect lights
    let ambientR = 0, ambientG = 0, ambientB = 0;
    let dirLightDir = new Vector3(0, 1, 0);
    let dirLightColorR = 1, dirLightColorG = 1, dirLightColorB = 1;
    let dirLightIntensity = 0;

    const collectLights = (obj: Object3D) => {
      if (obj instanceof AmbientLight) {
        ambientR += obj.color.r * obj.intensity;
        ambientG += obj.color.g * obj.intensity;
        ambientB += obj.color.b * obj.intensity;
      } else if (obj instanceof DirectionalLight) {
        const p = obj.position;
        const len = Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z) || 1;
        dirLightDir = new Vector3(p.x/len, p.y/len, p.z/len);
        dirLightColorR = obj.color.r;
        dirLightColorG = obj.color.g;
        dirLightColorB = obj.color.b;
        dirLightIntensity += obj.intensity;
      }
      obj.children.forEach(collectLights);
    };
    collectLights(scene);

    // Fog params
    const useFog = !!scene.fog;
    const fogNear = scene.fog?.near ?? 0;
    const fogFar = scene.fog?.far ?? 100;
    const fogColor = scene.fog?.color ?? new Color(0);

    // Render all objects
    const renderObj = (obj: Object3D) => {
      if (obj instanceof Mesh) {
        this._renderMesh(obj, viewMat, projMat, ambientR, ambientG, ambientB,
          dirLightDir, dirLightColorR, dirLightColorG, dirLightColorB, dirLightIntensity,
          useFog, fogNear, fogFar, fogColor);
      } else if (obj instanceof LineSegments) {
        this._renderLines(obj, obj.geometry, obj.material, viewMat, projMat);
      } else if (obj instanceof GridHelper) {
        this._renderLines(obj, obj._geometry, obj._material, viewMat, projMat);
      }
      obj.children.forEach(renderObj);
    };
    renderObj(scene);
  }

  private _renderMesh(
    mesh: Mesh, viewMat: Mat4, projMat: Mat4,
    ambR: number, ambG: number, ambB: number,
    lightDir: Vector3, lR: number, lG: number, lB: number, lI: number,
    useFog: boolean, fogNear: number, fogFar: number, fogColor: Color
  ) {
    const gl = this.gl;
    const buffers = this._getOrCreateBuffers(mesh.geometry);
    if (!buffers || buffers.isLines) return;

    const prog = this.meshProg;
    gl.useProgram(prog);

    const modelMat = mesh._getModelMatrix();
    const normalMat = mat4NormalMatrix(modelMat);

    // Uniforms
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'uModel'), false, modelMat);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'uView'), false, viewMat);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'uProj'), false, projMat);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'uNormalMat'), false, normalMat);

    const mat = mesh.material;
    gl.uniform3f(gl.getUniformLocation(prog, 'uColor'), mat.color.r, mat.color.g, mat.color.b);
    gl.uniform3f(gl.getUniformLocation(prog, 'uAmbient'), ambR, ambG, ambB);
    gl.uniform3f(gl.getUniformLocation(prog, 'uLightDir'), lightDir.x, lightDir.y, lightDir.z);
    gl.uniform3f(gl.getUniformLocation(prog, 'uLightColor'), lR, lG, lB);
    gl.uniform1f(gl.getUniformLocation(prog, 'uLightIntensity'), lI);
    gl.uniform1i(gl.getUniformLocation(prog, 'uUseFog'), useFog ? 1 : 0);
    gl.uniform1f(gl.getUniformLocation(prog, 'uFogNear'), fogNear);
    gl.uniform1f(gl.getUniformLocation(prog, 'uFogFar'), fogFar);
    gl.uniform3f(gl.getUniformLocation(prog, 'uFogColor'), fogColor.r, fogColor.g, fogColor.b);
    gl.uniform1i(gl.getUniformLocation(prog, 'uIsBasic'), ('_isBasic' in mat && (mat as any)._isBasic) ? 1 : 0);

    // Handle texture
    const hasTexture = !!(mat.map);
    gl.uniform1i(gl.getUniformLocation(prog, 'uUseTexture'), hasTexture ? 1 : 0);
    gl.uniform1i(gl.getUniformLocation(prog, 'uTransparent'), mat.transparent ? 1 : 0);
    if (hasTexture && mat.map) {
      const glTex = this._getOrCreateTexture(mat.map);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, glTex);
      gl.uniform1i(gl.getUniformLocation(prog, 'uTexture'), 0);
    }

    // Handle DoubleSide
    if (mat.side === DoubleSide) {
      gl.disable(gl.CULL_FACE);
    } else {
      gl.enable(gl.CULL_FACE);
    }

    // Handle transparency
    if (mat.transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    // Attributes
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.posB);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

    const aNorm = gl.getAttribLocation(prog, 'aNorm');
    if (buffers.normB && aNorm >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normB);
      gl.enableVertexAttribArray(aNorm);
      gl.vertexAttribPointer(aNorm, 3, gl.FLOAT, false, 0, 0);
    }

    const aUV = gl.getAttribLocation(prog, 'aUV');
    if (buffers.uvB && aUV >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uvB);
      gl.enableVertexAttribArray(aUV);
      gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.idxB);
    gl.drawElements(gl.TRIANGLES, buffers.count, gl.UNSIGNED_SHORT, 0);

    // Cleanup
    gl.disableVertexAttribArray(aPos);
    if (aNorm >= 0) gl.disableVertexAttribArray(aNorm);
    if (aUV >= 0) gl.disableVertexAttribArray(aUV);
    if (mat.transparent) gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
  }

  private _renderLines(
    obj: Object3D, geometry: BufferGeometry, material: LineBasicMaterial,
    viewMat: Mat4, projMat: Mat4
  ) {
    const gl = this.gl;
    const buffers = this._getOrCreateBuffers(geometry);
    if (!buffers) return;

    const prog = this.lineProg;
    gl.useProgram(prog);

    const modelMat = obj._getModelMatrix();
    const mvp = mat4Multiply(projMat, mat4Multiply(viewMat, modelMat));

    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'uMVP'), false, mvp);
    gl.uniform3f(gl.getUniformLocation(prog, 'uColor'), material.color.r, material.color.g, material.color.b);

    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.posB);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.LINES, 0, buffers.count);
    gl.disableVertexAttribArray(aPos);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteProgram(this.meshProg);
    gl.deleteProgram(this.lineProg);
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  }
}