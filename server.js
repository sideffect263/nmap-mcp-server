const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const xml2js = require('xml2js');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// In-memory store for tasks
const tasks = {};

// /introspect endpoint
app.get('/introspect', (req, res) => {
  res.json({
    name: 'Nmap Scanner',
    description: 'Scans a target using Nmap and returns structured results.',
    input_schema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Domain or IP address to scan' },
        flags: { type: 'string', description: 'Nmap flags (e.g., -T4 -p 1-1000)', default: '-T4 -p 1-1000' }
      },
      required: ['target']
    },
    output_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        status: { type: 'string' },
        // Define more output properties as needed
      }
    }
  });
});

// /invoke endpoint
app.post('/invoke', (req, res) => {
  const { target, flags = '-T4 -p 1-1000' } = req.body;

  if (!target) {
    return res.status(400).json({ error: 'Target is required' });
  }

  const taskId = uuidv4();
  tasks[taskId] = { id: taskId, status: 'pending', target, flags, result: null, error: null };

  // Ensure Nmap outputs in XML to stdout for parsing
  const nmapCommand = `nmap -oX - ${flags} ${target}`;
  console.log(`Starting Nmap scan for target: ${target} with command: ${nmapCommand}`);

  exec(nmapCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Nmap execution error: ${error.message}`);
      tasks[taskId].status = 'failed';
      tasks[taskId].error = `Nmap execution failed: ${error.message}`;
      if (stderr) {
        tasks[taskId].error += `\nStderr: ${stderr}`;
      }
      return;
    }

    // Nmap might output warnings to stderr even on success, so we log it.
    if (stderr) {
      console.warn(`Nmap stderr: ${stderr}`);
    }

    console.log(`Nmap scan raw XML output received for ${target}. Parsing...`);
    xml2js.parseString(stdout, { explicitArray: false, mergeAttrs: true }, (parseError, parsedResult) => {
      if (parseError) {
        console.error(`Nmap XML parsing error: ${parseError.message}`);
        tasks[taskId].status = 'failed';
        tasks[taskId].error = `Failed to parse Nmap XML output: ${parseError.message}`;
        return;
      }
      console.log(`Nmap XML parsed successfully for ${target}`);
      tasks[taskId].status = 'completed';
      tasks[taskId].result = parsedResult;
    });
  });

  res.status(202).json({ taskId, status: 'pending', message: 'Nmap scan initiated' });
});

// /result endpoint
app.get('/result/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = tasks[taskId];

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.status === 'pending') {
    return res.status(202).json({ taskId, status: 'pending', message: 'Nmap scan is still in progress.' });
  }

  if (task.status === 'failed') {
    return res.status(500).json({ taskId, status: 'failed', error: task.error });
  }

  res.json({ taskId, status: 'completed', result: task.result }); // Will return structured result later
});

app.listen(port, () => {
  console.log(`Nmap MCP server listening at http://localhost:${port}`);
}); 