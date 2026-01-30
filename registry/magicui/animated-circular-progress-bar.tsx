
import { cn } from "@/lib/utils";

interface AnimatedCircularProgressBarProps {
    max?: number;
    value: number;
    min?: number;
    gaugePrimaryColor?: string;
    gaugeSecondaryColor?: string;
    className?: string;
}

export function AnimatedCircularProgressBar({
    max = 100,
    min = 0,
    value = 0,
    gaugePrimaryColor = "rgb(249 115 22)", // Default to Orange
    gaugeSecondaryColor = "rgba(0, 0, 0, 0.1)",
    className,
}: AnimatedCircularProgressBarProps) {
    const circumference = 2 * Math.PI * 45;
    const percent = value / (max - min);
    const strokeDashoffset = circumference - percent * circumference;

    return (
        <div
            className={cn("relative size-40 text-2xl font-semibold", className)}
            style={
                {
                    "--circumference": circumference,
                    "--percent-to-px": `${percent * circumference}px`,
                    "--gap-percent": "5px",
                    "--offset-factor": "0",
                    "--transition-length": "1s",
                    "--transition-step": "200ms",
                    "--delay": "0s",
                    "--percent-to-deg": "3.6deg",
                    transform: "translateZ(0)",
                } as React.CSSProperties
            }
        >
            <svg
                className="size-full -rotate-90 transform stroke-linecap-round"
                viewBox="0 0 100 100"
            >
                <circle
                    className="text-gray-200 transition-all duration-300 ease-in-out"
                    stroke={gaugeSecondaryColor}
                    strokeWidth="10"
                    fill="none"
                    cx="50"
                    cy="50"
                    r="45"
                />
                <circle
                    className="transition-all duration-1000 ease-out"
                    stroke={gaugePrimaryColor}
                    strokeWidth="10"
                    fill="none"
                    cx="50"
                    cy="50"
                    r="45"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
}
