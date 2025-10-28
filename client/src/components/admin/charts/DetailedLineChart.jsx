import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const DetailedLineChart = ({ data, selectedGame }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Process data
    const processedData = selectedGame
      ? data.map(d => ({
          timestamp: new Date(d.timestamp),
          playing: d.playing || 0
        })).reverse()
      : data.reduce((acc, d) => {
          const timestamp = new Date(d.timestamp);
          const existing = acc.find(item => item.timestamp.getTime() === timestamp.getTime());
          if (existing) {
            existing.playing += d.playing || 0;
          } else {
            acc.push({
              timestamp,
              playing: d.playing || 0
            });
          }
          return acc;
        }, []).sort((a, b) => a.timestamp - b.timestamp);

    if (processedData.length === 0) return;

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(processedData, d => d.timestamp))
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(processedData, d => d.playing)])
      .nice()
      .range([height, 0]);

    // Line generator
    const line = d3.line()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.playing))
      .curve(d3.curveMonotoneX);

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat('%m/%d')))
      .selectAll('text')
      .attr('fill', 'white')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    svg.selectAll('.domain, .tick line')
      .attr('stroke', 'white');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .attr('fill', 'white');

    svg.selectAll('.domain, .tick line')
      .attr('stroke', 'white');

    // Add line
    svg.append('path')
      .datum(processedData)
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add dots
    svg.selectAll('circle')
      .data(processedData)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.timestamp))
      .attr('cy', d => yScale(d.playing))
      .attr('r', 3)
      .attr('fill', 'white')
      .on('mouseover', function(event, d) {
        const tooltip = d3.select('body').append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('background', 'black')
          .style('border', '1px solid white')
          .style('padding', '8px')
          .style('color', 'white')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .html(`
            <div><strong>Time:</strong> ${d3.timeFormat('%Y-%m-%d %H:%M')(d.timestamp)}</div>
            <div><strong>Playing:</strong> ${d.playing.toLocaleString()}</div>
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');

        d3.select(this)
          .attr('r', 5)
          .attr('fill', '#22c55e');
      })
      .on('mouseout', function() {
        d3.selectAll('.tooltip').remove();
        d3.select(this)
          .attr('r', 3)
          .attr('fill', 'white');
      });

    // Add labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .text('Date');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .text('Players');

  }, [data, selectedGame]);

  return (
    <div className="flex justify-center">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default DetailedLineChart;
