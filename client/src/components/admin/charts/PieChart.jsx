import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const PieChart = ({ data }) => {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [selectedSlice, setSelectedSlice] = useState(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Dimensions
    const width = 600;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Create pie generator
    const pie = d3
      .pie()
      .value((d) => d.value)
      .sort(null);

    // Create arc generator
    const arc = d3
      .arc()
      .innerRadius(0)
      .outerRadius(radius);

    // Highlighted arc
    const arcHover = d3
      .arc()
      .innerRadius(0)
      .outerRadius(radius + 10);

    // Create slices
    const slices = svg
      .selectAll("path")
      .data(pie(data))
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", "white")
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        // Highlight slice
        d3.select(this)
          .transition()
          .duration(200)
          .attr("d", arcHover);

        // Show tooltip
        const tooltip = d3.select(tooltipRef.current);
        tooltip
          .style("opacity", 1)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px")
          .html(`
            <div style="background: black; color: white; padding: 8px; border: 1px solid white; font-size: 12px;">
              <strong>${d.data.name}</strong><br/>
              Players: ${d.data.value.toLocaleString()}<br/>
              ${((d.data.value / d3.sum(data, d => d.value)) * 100).toFixed(1)}%
            </div>
          `);
      })
      .on("mouseout", function (event, d) {
        // Reset slice
        if (selectedSlice !== d.data.name) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("d", arc);
        }

        // Hide tooltip
        d3.select(tooltipRef.current).style("opacity", 0);
      })
      .on("click", function (event, d) {
        setSelectedSlice(d.data.name);
      });

    // Add labels
    svg
      .selectAll("text")
      .data(pie(data))
      .enter()
      .append("text")
      .attr("transform", (d) => `translate(${arc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .text((d) => {
        const percentage = ((d.data.value / d3.sum(data, d => d.value)) * 100);
        return percentage > 5 ? `${percentage.toFixed(0)}%` : '';
      });

  }, [data, selectedSlice]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white/50">
        No data available
      </div>
    );
  }

  return (
    <div className="relative flex justify-center">
      <svg ref={svgRef}></svg>
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity 0.2s",
        }}
      />
    </div>
  );
};

export default PieChart;
