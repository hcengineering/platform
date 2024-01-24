<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
    export let text: string = "Hello world!";
    export let width: string = "100%";
    export let height: string = "100%";
    
    window.addEventListener("load", () => {
        const canvas = <HTMLCanvasElement> document.getElementById("canvas1");
        const ctx = canvas.getContext("2d", {
            willReadFrequently: true
        });
        canvas.style.width = width;
        canvas.style.height = height;
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        console.log("AAAA:", canvas.clientWidth, canvas.clientHeight)

        if (!ctx) return;

        class Particle {
            effect: Effect
            x: number
            y: number
            color: string
            originX: number
            originY: number
            size: number
            dx: number
            dy: number
            vx: number
            vy: number
            force: number
            angle: number
            distance: number
            friction: number
            ease: number
            constructor(effect: Effect, x: number, y: number, color: string) {
                this.effect = effect;
                this.x = Math.random() * this.effect.canvasWidth;
                this.y = this.effect.canvasHeight;
                this.color = color;
                this.originX = x;
                this.originY = y;
                this.size = this.effect.gap;
                this.dx = 0;
                this.dy = 0;
                this.vx = 0;
                this.vy = 0;
                this.force = 0;
                this.angle = 0;
                this.distance = 0;
                this.friction = Math.random() * 0.6 + 0.15;
                this.ease = Math.random() * 0.1 + 0.005;
            }

            draw() {
                this.effect.context.fillStyle = this.color;
                this.effect.context.fillRect(this.x, this.y, this.size, this.size);
            }

            update() {
                this.dx = this.effect.mouse.x - this.x;
                this.dy = this.effect.mouse.y - this.y;
                this.distance = this.dx * this.dx + this.dy * this.dy;
                this.force = -this.effect.mouse.radius / this.distance;

                if (this.distance < this.effect.mouse.radius) {
                    this.angle = Math.atan2(this.dy, this.dx);
                    this.vx += this.force * Math.cos(this.angle);
                    this.vy += this.force * Math.sin(this.angle);
                }

                this.x += (this.vx *= this.friction) + (this.originX - this.x) * this.ease;
                this.y += (this.vy *= this.friction) + (this.originY - this.y) * this.ease;
            }
        }

        class Effect {
            context: CanvasRenderingContext2D
            canvasWidth: number
            canvasHeight: number
            textX: number
            textY: number
            lineHeight: number
            fontSize: number
            particles: Particle[]
            gap: number
            mouse: { radius: number; x: number; y: number }
            maxTextWidth: number
            constructor(context: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
                this.context = context;
                this.canvasWidth = canvasWidth;
                this.canvasHeight = canvasHeight;
                this.textX = this.canvasWidth / 2;
                this.textY = this.canvasHeight / 2;
                this.fontSize = (canvas.width / 2) * 0.4;
                this.lineHeight = this.fontSize * 0.9;
                this.maxTextWidth = this.canvasWidth * 0.8;
                this.particles = [];
                this.gap = 2;
                this.mouse = {
                    radius: 4000,
                    x: 0,
                    y: 0
                }

                window.addEventListener("mousemove", (e) => {
                    this.mouse.x = e.offsetX;
                    this.mouse.y = e.offsetY;
                })
            }

            wrapText(text: string) {
                // const gradient = this.context.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
                // gradient.addColorStop(0.3, "black");
                // gradient.addColorStop(0.5, "black");
                // gradient.addColorStop(0.7, "black");
                this.context.fillStyle = "white";
                this.context.textAlign = "center";
                this.context.textBaseline = "middle";
                this.context.lineWidth = 1;
                // this.context.strokeStyle = "white";
                this.context.font = `${this.fontSize}px Orienta`;

                let linesArray: string[] = [];
                let words = text.split(" ");
                let lineCounter = 0;
                let line = "";
                for (let i = 0; i < words.length; i++) {
                    let testLine = line + words[i] + " ";
                    if (this.context.measureText(testLine).width > this.maxTextWidth) {
                        line = words[i] + " ";
                        lineCounter++;
                    } else {
                        line = testLine;
                    }
                    linesArray[lineCounter] = line;
                }
                let textHeight = this.lineHeight * lineCounter;
                this.textY = this.canvasHeight / 2 - textHeight / 2;
                linesArray.forEach((e, i) => {
                    this.context.fillText(e, this.textX, this.textY + (i * this.lineHeight));
                    // this.context.strokeText(e, this.textX, this.textY + (i * this.lineHeight));
                })
                this.convertToParticles();
            }

            convertToParticles() {
                if (!this.canvasWidth || !this.canvasHeight) return;

                this.particles = [];
                const pixels = this.context.getImageData(0, 0, this.canvasWidth, this.canvasHeight).data;
                this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

                // TODO: Improve the performance
                for (let y = 0; y < this.canvasHeight; y += this.gap) {
                    for (let x = 0; x < this.canvasWidth; x += this.gap) {
                        const index = (y * this.canvasWidth + x) * 4;
                        const alpha = pixels[index + 3];

                        if (alpha > 0) {
                            const red = pixels[index];
                            const green = pixels[index + 1];
                            const blue = pixels[index + 2];
                            const color = `rgb(${red},${green},${blue})`
                            this.particles.push(new Particle(this, x, y, color));
                        }
                    }
                }
            }

            render() {
                this.particles.forEach((particles) => {
                    particles.update();
                    particles.draw();
                })
            }

            resize(width: number, height: number) {
                this.canvasWidth = width;
                this.canvasHeight = height;
                this.textX = this.canvasWidth / 2;
                this.textY = this.canvasHeight / 2;
                this.maxTextWidth = this.canvasWidth * 0.8;
                this.fontSize = (canvas.width / 2) * 0.4;
            }
        }

        const effect = new Effect(ctx, canvas.width, canvas.height);
        effect.wrapText(text);
        effect.render();

        function animate() {
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            effect.render();
            requestAnimationFrame(animate); 
        }

        animate();

        let resizeTimer: number | undefined
        
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                effect.resize(canvas.width, canvas.height);
                effect.wrapText(text);
            }, 1000);
        })
        
    })
</script>
  
  <div class="main">
    <canvas id="canvas1"></canvas>
  </div>
  
  <style lang="scss">
    .main {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
    }
  </style>
  