import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Button } from '../../ui/button';

const LineChart = ({ data, games, timeRange, onTimeRangeChange }) => {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [visibleGames, setVisibleGames] = useState(new Set(games || []));

  const timeRanges = [
    { label: '7 Days', value: '7d' },
    { label: '1 Month', value: '1m' },
    { label: '1 Year', value: '1y' },
    { label: 'All Time', value: 'all' }
  ];

  const toggleGame = (gameName) => {
    setVisibleGames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gameName)) {
        newSet.delete(gameName);
      } else {
        newSet.add(gameName);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Dimensions
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse time
    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    const formatTime = d3.timeFormat("%b %d, %I%p");

    // Prepare data
    const processedData = data.map(d => ({
      ...d,
      timestamp: parseTime(d.timestamp)
    })).filter(d => d.timestamp);

    if (processedData.length === 0) return;

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(processedData, d => d.timestamp))
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(processedData, d => d.totalPlaying)])
      .nice()
      .range([height, 0]);

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(formatTime);
    const yAxis = d3.axisLeft(yScale);

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "white")
      .style("font-size", "12px");

    svg.selectAll(".domain, .tick line")
      .attr("stroke", "white");

    svg
      .append("g")
      .call(yAxis)
      .selectAll("text")
      .attr("fill", "white")
      .style("font-size", "12px");

    svg.selectAll(".domain, .tick line")
      .attr("stroke", "white");

    // Grid lines
    svg
      .append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(
        d3
          .axisLeft(yScale)
          .tickSize(-width)
          .tickFormat("")
      )
      .selectAll("line")
      .attr("stroke", "white");

    // Line generator
    const line = d3
      .line()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.totalPlaying))
      .curve(d3.curveMonotoneX);

    // Draw line
    svg
      .append("path")
      .datum(processedData)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add data points
    svg
      .selectAll("circle")
      .data(processedData)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.timestamp))
      .attr("cy", d => yScale(d.totalPlaying))
      .attr("r", 4)
      .attr("fill", "white")
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        // Enlarge point
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", 6);

        // Show tooltip
        const tooltip = d3.select(tooltipRef.current);
        tooltip
          .style("opacity", 1)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px")
          .html(`
            <div style="background: black; color: white; padding: 8px; border: 1px solid white; font-size: 12px;">
              <strong>${formatTime(d.timestamp)}</strong><br/>
              Players: ${d.totalPlaying.toLocaleString()}
            </div>
          `);
      })
      .on("mouseout", function () {
        // Reset point
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", 4);

        // Hide tooltip
        d3.select(tooltipRef.current).style("opacity", 0);
      });

  }, [data, visibleGames]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white/50">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {timeRanges.map(range => (
          <Button
            key={range.value}
            size="sm"
            onClick={() => onTimeRangeChange && onTimeRangeChange(range.value)}
            className={timeRange === range.value ? "bg-white text-black" : "bg-black text-white"}
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* Chart */}
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
    </div>
  );
};

export default LineChart;
