import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const PieChart = ({ data, metric = "playing" }) => {
  const svgRef = useRef();
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const metricLabels = {
    playing: "Current Players",
    visits: "Total Visits",
    favorites: "Favorites",
  };

  // Red/Yellow/Orange color palette
  const colorScale = d3.scaleOrdinal().range([
    "#DC2626", // red-600
    "#EA580C", // orange-600
    "#D97706", // amber-600
    "#F59E0B", // amber-500
    "#EF4444", // red-500
    "#F97316", // orange-500
    "#FB923C", // orange-400
    "#FBBF24", // amber-400
    "#FCD34D", // amber-300
  ]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Dimensions
    const width = 600;
    const height = 450;
    const radius = Math.min(width, height) / 2 - 60;
    const depth = 30; // 3D depth

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2 - 20})`);

    // Create pie generator
    const pie = d3
      .pie()
      .value((d) => d.value)
      .sort(null);

    // Create arc generators for 3D effect
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const arcHover = d3
      .arc()
      .innerRadius(0)
      .outerRadius(radius + 15);

    const pieData = pie(data);

    // Draw 3D side edges (depth effect)
    const sidesGroup = svg.append("g").attr("class", "sides");

    pieData.forEach((d, i) => {
      const startAngle = d.startAngle;
      const endAngle = d.endAngle;
      const color = colorScale(i);

      // Create darker shade for side
      const sideColor = d3.color(color).darker(1.5);

      // Draw side faces for 3D effect
      const points = [];
      const steps = 20;
      for (let j = 0; j <= steps; j++) {
        const angle = startAngle + (endAngle - startAngle) * (j / steps);
        const x = Math.cos(angle - Math.PI / 2) * radius;
        const y = Math.sin(angle - Math.PI / 2) * radius;
        points.push([x, y]);
      }

      // Draw the side polygon
      const sidePath =
        points
          .map((p, idx) => {
            if (idx === 0) return `M ${p[0]} ${p[1]}`;
            return `L ${p[0]} ${p[1]}`;
          })
          .join(" ") +
        ` L ${points[points.length - 1][0]} ${
          points[points.length - 1][1] + depth
        }` +
        points
          .reverse()
          .map((p) => ` L ${p[0]} ${p[1] + depth}`)
          .join("") +
        " Z";

      sidesGroup.append("path").attr("d", sidePath).attr("fill", sideColor);
    });

    // Draw top slices
    const slices = svg
      .append("g")
      .attr("class", "slices")
      .selectAll("path")
      .data(pieData)
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => colorScale(i))
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        // Highlight slice
        d3.select(this).transition().duration(200).attr("d", arcHover);

        // Update tooltip state
        setHoveredSlice({
          name: d.data.name,
          value: d.data.value,
          percentage: (
            (d.data.value / d3.sum(data, (d) => d.value)) *
            100
          ).toFixed(1),
        });
      })
      .on("mouseout", function (event, d) {
        // Reset slice
        d3.select(this).transition().duration(200).attr("d", arc);

        // Clear tooltip
        setHoveredSlice(null);
      });

    // Add percentage labels on slices
    svg
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(pieData)
      .enter()
      .append("text")
      .attr("transform", (d) => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .style("text-shadow", "0 0 3px black, 0 0 3px black")
      .text((d) => {
        const percentage = (d.data.value / d3.sum(data, (d) => d.value)) * 100;
        return percentage > 5 ? `${percentage.toFixed(0)}%` : "";
      });
  }, [data, metric]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white/50">
        No data available
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex justify-center items-center">
        <svg ref={svgRef}></svg>
      </div>

      {/* Fixed tooltip at bottom left */}
      <div className="absolute bottom-0 left-0 p-4 bg-black border border-white/20 rounded min-w-[200px] min-h-[80px]">
        {hoveredSlice ? (
          <div className="text-white">
            <div className="font-bold text-sm mb-1">{hoveredSlice.name}</div>
            <div className="text-xs text-white/70">
              {metricLabels[metric]}: {hoveredSlice.value.toLocaleString()}
            </div>
            <div className="text-lg font-bold mt-1">
              {hoveredSlice.percentage}%
            </div>
          </div>
        ) : (
          <div className="text-white/50 text-sm">
            Hover over a slice to see details
          </div>
        )}
      </div>
    </div>
  );
};

export default PieChart;
