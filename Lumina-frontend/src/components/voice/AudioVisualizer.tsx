import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
    isListening: boolean;
    isSpeaking: boolean;
    analyserNode?: AnalyserNode | null;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
    isListening,
    isSpeaking,
    analyserNode,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationId: number;

        const draw = () => {
            animationId = requestAnimationFrame(draw);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const width = canvas.width;
            const height = canvas.height;
            const centerY = height / 2;

            if (isSpeaking && analyserNode) {
                const bufferLength = analyserNode.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyserNode.getByteFrequencyData(dataArray);

                ctx.fillStyle = "#8b5cf6";
                const barWidth = (width / bufferLength) * 2;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = (dataArray[i] / 255) * height * 0.8;
                    ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
                    x += barWidth;
                }
            } else if (isListening) {
                // Pulsing wave sine animation when listening
                const time = Date.now() * 0.005;
                ctx.beginPath();
                ctx.lineWidth = 3;
                ctx.strokeStyle = "#3b82f6";

                for (let x = 0; x < width; x += 2) {
                    const y = centerY + Math.sin(x * 0.05 + time) * 12;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            } else {
                // Idle flat line
                ctx.beginPath();
                ctx.lineWidth = 2;
                ctx.strokeStyle = "#6b7280";
                ctx.moveTo(0, centerY);
                ctx.lineTo(width, centerY);
                ctx.stroke();
            }
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [isListening, isSpeaking, analyserNode]);

    return (
        <div className="flex justify-center items-center my-2">
            <canvas ref={canvasRef} width={280} height={48} className="rounded-lg bg-gray-900/50" />
        </div>
    );
};

export default AudioVisualizer;
