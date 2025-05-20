// Draw the full waveform of the audio
function drawWaveform(data, canvas, currentTime, totalTime, promptTime = 3) {
  const ctx = canvas.getContext("2d");
  // console.log((new Date()).getTime());

  const step = Math.ceil(data.length / canvas.width);
  const amp = canvas.height / 2;
  const currentRatio = currentTime / totalTime;
  const promptRatio = promptTime / totalTime;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "transparent"; // Background color
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const barWidth = 2; //4;      // Width of each bar
  const gap = 1; // Space between bars

  let maxVal = 0;
  let sumArray = [];
  for (let i = 0; i < canvas.width; i += barWidth + gap) {
    let sum = 0;
    for (let j = 0; j < step; j++) {
      // const datum = data[(i * step / (barWidth + gap)) + j];
      const datum = Math.abs(data[i * step + j]);
      sum += datum;
    }
    sumArray.push(sum);
    maxVal = Math.max(sum, maxVal);
  }

  for (let i = 0; i < canvas.width; i += barWidth + gap) {
    let mean = sumArray[Math.round(i / (barWidth + gap))] / maxVal;
    mean = Math.pow(mean, 0.8);
    mean = Math.max(mean, 0.05);
    // console.log(maxVal, mean);
    if (i < currentRatio * canvas.width) {
      if (i < promptRatio * canvas.width) {
        ctx.fillStyle = "#8FBDDF"; //"#F06A8A";
      } else {
        ctx.fillStyle = "#9FDE83"; //"#8FBDDF";
      }
    } else {
      ctx.fillStyle = "#858585";
    }
    ctx.beginPath();
    // ctx.fillRect(i, (1 + min) * amp, barWidth, (max - min) * amp);
    ctx.roundRect(i, (1 - mean) * amp, barWidth, 2 * mean * amp, [100]);
    // ctx.stroke();
    ctx.fill();
  }
}

function audioVisualizer(audio, canvas, promptTime = 3) {
  let audioData = null;

  // Set up AudioContext and Analyzer
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  // Fetch and decode the audio file data
  fetch(audio.src)
    .then((response) => response.arrayBuffer())
    .then((data) => audioContext.decodeAudioData(data))
    .then((buffer) => {
      audioData = buffer.getChannelData(0);
      drawWaveform(audioData, canvas, 0, audio.duration, promptTime);
    });

  audio.addEventListener("play", function () {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  });

  let userInteracted = false;
  audio.addEventListener("seeking", function () {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    userInteracted = true;
  });

  // Update waveform display during audio playback
  setInterval(function () {
    if (audio.paused != true || userInteracted) {
      drawWaveform(
        audioData,
        canvas,
        audio.currentTime,
        audio.duration,
        promptTime,
      );
      userInteracted = false;
    }
  }, 50);
}

function divBuilderMatchaLJSpeech(id, data) {
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < data["text_list"].length; i++) { // 对于每个要展示的条目
    const copiedNode = document.importNode(
      document.querySelector("#prompt-template").content,
      true
    );

    // 填充非表格部分 (和原来类似)
    const promptParagraph = copiedNode.querySelector(".ditto-prompt-text");
    if (promptParagraph) {
      promptParagraph.remove(); // 假设我们不显示 prompt text
    }
    const textElement = copiedNode.querySelector(".ditto-text > span");
    if (textElement) {
      textElement.innerText = data["text_list"][i];
    }
    // 移除模板中可能存在的顶部音频播放器，因为我们会在表格中动态创建
    const audioOnTop = copiedNode.querySelector(".ditto-audioviz audio");
    if (audioOnTop) {
      audioOnTop.remove();
    }
    // 移除toggle元素，因为我们将默认展开
    const toggleElement = copiedNode.querySelector(".ditto-toggle");
    if (toggleElement) {
      toggleElement.remove();
    }
    const sampleBox = copiedNode.querySelector(".ditto-sample-box");
    if (sampleBox) {
      sampleBox.classList.add("show"); // 默认展开
    }


    // --- 动态构建第一个表格 ---
    const table1 = copiedNode.querySelector(".dynamically-generated-table-1");
    const thead1 = table1.querySelector('thead');
    const tbody1 = table1.querySelector('tbody');

    // 清空可能存在的预设内容 (如果模板中的 a_thead 和 a_tbody 不是完全空的)
    if (thead1) thead1.innerHTML = '';
    if (tbody1) tbody1.innerHTML = '';

    // 动态定义表头1
    const headers1 = ["SFM (α=2.5)", "Ground truth", "Vocoder reconstructed", "Baseline", "Ablated"]; // 示例表头
    const headerRow1 = thead1.insertRow();
    headers1.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      // 可以根据需要给表头添加特定类名或样式
      if (headerText === "SFM (α=2.5)") th.className = "border-right"; // 模拟原样式
      headerRow1.appendChild(th);
    });

    // 动态定义数据行1 (基于 data["path_sort_list"] 的前几个)
    const dataRow1 = tbody1.insertRow();
    const numCols1 = headers1.length; // 表格1的列数
    for (let j = 0; j < numCols1; j++) {
      if (j < data["path_sort_list"].length) { // 确保有数据
        const cell = dataRow1.insertCell();
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = "none";
        audio.src = data["path_sort_list"][j] + "/" + data["wav_list"][i];
        cell.appendChild(audio);
        // 可以根据需要给单元格添加特定类名或data-label
        if (j === 0) cell.className = "border-right";
        cell.setAttribute('data-label', headers1[j]); // 对应表头
      }
    }

    // --- 动态构建第二个表格 (类似地) ---
    const table2 = copiedNode.querySelector(".dynamically-generated-table-2");
    const thead2 = table2.querySelector('thead');
    const tbody2 = table2.querySelector('tbody');

    if (thead2) thead2.innerHTML = '';
    if (tbody2) tbody2.innerHTML = '';

    const headers2 = ["SFM (α=1.0)", "SFM (α=2.0)", "SFM (α=3.0)", "SFM (α=4.0)", "SFM (α=5.0)"];
    const headerRow2 = thead2.insertRow();
    headers2.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow2.appendChild(th);
    });

    const dataRow2 = tbody2.insertRow();
    const startIndexTable2 = numCols1; // 从 path_sort_list 中 table1 用完之后的数据开始
    for (let k = 0; k < headers2.length; k++) {
      const dataIndex = startIndexTable2 + k; // 对应 path_sort_list 中的索引
      if (dataIndex < data["path_sort_list"].length) {
        const cell = dataRow2.insertCell();
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = "none";
        audio.src = data["path_sort_list"][dataIndex] + "/" + data["wav_list"][i];
        cell.appendChild(audio);
        cell.setAttribute('data-label', headers2[k]);
      } else if (dataIndex < data["path_sort_list"].length) {
        const cell = dataRow2.insertCell();
        // cell.textContent = "N/A";
        cell.setAttribute('data-label', headers2[k]);
      }
    }

    fragment.appendChild(copiedNode);
  }

  const root = document.querySelector(id);
  root.appendChild(fragment); // 将所有生成的卡片一次性添加到DOM
}

function divBuilderMatchaVCTK(id, data) {
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < data["text_list"].length; i++) { // 对于每个要展示的条目
    const copiedNode = document.importNode(
      document.querySelector("#prompt-template").content,
      true
    );

    // 填充非表格部分 (和原来类似)
    const promptParagraph = copiedNode.querySelector(".ditto-prompt-text");
    if (promptParagraph) {
      promptParagraph.remove(); // 假设我们不显示 prompt text
    }
    const textElement = copiedNode.querySelector(".ditto-text > span");
    if (textElement) {
      textElement.innerText = data["text_list"][i];
    }
    // 移除模板中可能存在的顶部音频播放器，因为我们会在表格中动态创建
    const audioOnTop = copiedNode.querySelector(".ditto-audioviz audio");
    if (audioOnTop) {
      audioOnTop.remove();
    }
    // 移除toggle元素，因为我们将默认展开
    const toggleElement = copiedNode.querySelector(".ditto-toggle");
    if (toggleElement) {
      toggleElement.remove();
    }
    const sampleBox = copiedNode.querySelector(".ditto-sample-box");
    if (sampleBox) {
      sampleBox.classList.add("show"); // 默认展开
    }


    // --- 动态构建第一个表格 ---
    const table1 = copiedNode.querySelector(".dynamically-generated-table-1");
    const thead1 = table1.querySelector('thead');
    const tbody1 = table1.querySelector('tbody');

    // 清空可能存在的预设内容 (如果模板中的 a_thead 和 a_tbody 不是完全空的)
    if (thead1) thead1.innerHTML = '';
    if (tbody1) tbody1.innerHTML = '';

    // 动态定义表头1
    const headers1 = ["SFM (α=3.5)", "Ground truth", "Vocoder reconstructed", "Baseline", "Ablated"]; // 示例表头
    const headerRow1 = thead1.insertRow();
    headers1.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      // 可以根据需要给表头添加特定类名或样式
      if (headerText === "SFM (α=3.5)") th.className = "border-right"; // 模拟原样式
      headerRow1.appendChild(th);
    });

    // 动态定义数据行1 (基于 data["path_sort_list"] 的前几个)
    const dataRow1 = tbody1.insertRow();
    const numCols1 = headers1.length; // 表格1的列数
    for (let j = 0; j < numCols1; j++) {
      if (j < data["path_sort_list"].length) { // 确保有数据
        const cell = dataRow1.insertCell();
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = "none";
        audio.src = data["path_sort_list"][j] + "/" + data["wav_list"][i];
        cell.appendChild(audio);
        // 可以根据需要给单元格添加特定类名或data-label
        if (j === 0) cell.className = "border-right";
        cell.setAttribute('data-label', headers1[j]); // 对应表头
      } 
    }

    // --- 动态构建第二个表格 (类似地) ---
    const table2 = copiedNode.querySelector(".dynamically-generated-table-2");
    const thead2 = table2.querySelector('thead');
    const tbody2 = table2.querySelector('tbody');

    if (thead2) thead2.innerHTML = '';
    if (tbody2) tbody2.innerHTML = '';

    const headers2 = ["SFM (α=1.0)", "SFM (α=2.0)", "SFM (α=3.0)", "SFM (α=4.0)", "SFM (α=5.0)"];
    const headerRow2 = thead2.insertRow();
    headers2.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow2.appendChild(th);
    });

    const dataRow2 = tbody2.insertRow();
    const startIndexTable2 = numCols1; // 从 path_sort_list 中 table1 用完之后的数据开始
    for (let k = 0; k < headers2.length; k++) {
      const dataIndex = startIndexTable2 + k; // 对应 path_sort_list 中的索引
      if (dataIndex < data["path_sort_list"].length) {
        const cell = dataRow2.insertCell();
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = "none";
        audio.src = data["path_sort_list"][dataIndex] + "/" + data["wav_list"][i];
        cell.appendChild(audio);
        cell.setAttribute('data-label', headers2[k]);
      } else if (dataIndex < data["path_sort_list"].length) {
        const cell = dataRow2.insertCell();
        // cell.textContent = "N/A";
        cell.setAttribute('data-label', headers2[k]);
      }
    }

    fragment.appendChild(copiedNode);
  }

  const root = document.querySelector(id);
  root.appendChild(fragment); // 将所有生成的卡片一次性添加到DOM
}

function divBuilderStableVCTK(id, data) {
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < data["text_list"].length; i++) { // 对于每个要展示的条目
    const copiedNode = document.importNode(
      document.querySelector("#prompt-template").content,
      true
    );

    // 填充非表格部分 (和原来类似)
    const promptParagraph = copiedNode.querySelector(".ditto-prompt-text");
    if (promptParagraph) {
      promptParagraph.remove(); // 假设我们不显示 prompt text
    }
    const textElement = copiedNode.querySelector(".ditto-text > span");
    if (textElement) {
      textElement.innerText = data["text_list"][i];
    }
    // 移除模板中可能存在的顶部音频播放器，因为我们会在表格中动态创建
    const audioOnTop = copiedNode.querySelector(".ditto-audioviz audio");
    if (audioOnTop) {
      audioOnTop.remove();
    }
    // 移除toggle元素，因为我们将默认展开
    const toggleElement = copiedNode.querySelector(".ditto-toggle");
    if (toggleElement) {
      toggleElement.remove();
    }
    const sampleBox = copiedNode.querySelector(".ditto-sample-box");
    if (sampleBox) {
      sampleBox.classList.add("show"); // 默认展开
    }


    // --- 动态构建第一个表格 ---
    const table1 = copiedNode.querySelector(".dynamically-generated-table-1");
    const thead1 = table1.querySelector('thead');
    const tbody1 = table1.querySelector('tbody');

    // 清空可能存在的预设内容 (如果模板中的 a_thead 和 a_tbody 不是完全空的)
    if (thead1) thead1.innerHTML = '';
    if (tbody1) tbody1.innerHTML = '';

    // 动态定义表头1
    const headers1 = ["SFM (α=3.0)", "Ground truth", "Vocoder reconstructed", "Ablated", "SFM-c (α=4.5)"]; // 示例表头
    const headerRow1 = thead1.insertRow();
    headers1.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      // 可以根据需要给表头添加特定类名或样式
      if (headerText === "SFM (α=3.0)") th.className = "border-right"; // 模拟原样式
      headerRow1.appendChild(th);
    });

    // 动态定义数据行1 (基于 data["path_sort_list"] 的前几个)
    const dataRow1 = tbody1.insertRow();
    const numCols1 = headers1.length; // 表格1的列数
    for (let j = 0; j < numCols1; j++) {
      if (j < data["path_sort_list"].length) { // 确保有数据
        const cell = dataRow1.insertCell();
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = "none";
        audio.src = data["path_sort_list"][j] + "/" + data["wav_list"][i];
        cell.appendChild(audio);
        // 可以根据需要给单元格添加特定类名或data-label
        if (j === 0) cell.className = "border-right";
        cell.setAttribute('data-label', headers1[j]); // 对应表头
      }
    }

    // --- 动态构建第二个表格 (类似地) ---
    const table2 = copiedNode.querySelector(".dynamically-generated-table-2");
    const thead2 = table2.querySelector('thead');
    const tbody2 = table2.querySelector('tbody');

    if (thead2) thead2.innerHTML = '';
    if (tbody2) tbody2.innerHTML = '';

    const headers2 = ["SFM (α=1.0)", "SFM (α=2.0)", "SFM (α=4.0)", "SFM (α=5.0)"];
    const headerRow2 = thead2.insertRow();
    headers2.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow2.appendChild(th);
    });

    const dataRow2 = tbody2.insertRow();
    const startIndexTable2 = numCols1; // 从 path_sort_list 中 table1 用完之后的数据开始
    for (let k = 0; k < headers2.length; k++) {
      const dataIndex = startIndexTable2 + k; // 对应 path_sort_list 中的索引
      if (dataIndex < data["path_sort_list"].length) {
        const cell = dataRow2.insertCell();
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = "none";
        audio.src = data["path_sort_list"][dataIndex] + "/" + data["wav_list"][i];
        cell.appendChild(audio);
        cell.setAttribute('data-label', headers2[k]);
      } else if (dataIndex < data["path_sort_list"].length) {
        const cell = dataRow2.insertCell();
        // cell.textContent = "N/A";
        cell.setAttribute('data-label', headers2[k]);
      }
    }

    fragment.appendChild(copiedNode);
  }

  const root = document.querySelector(id);
  root.appendChild(fragment); // 将所有生成的卡片一次性添加到DOM
}

function divBuilderCosyVoiceLibriTTS(id, data) {
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < data["text_list"].length; i++) { // 对于每个要展示的条目
    const copiedNode = document.importNode(
      document.querySelector("#prompt-template").content,
      true
    );

    const promptText = copiedNode.querySelector(".ditto-prompt-text > span");
    promptText.innerText = data["prompt_text_list"][i];
    const text = copiedNode.querySelector(".ditto-text > span");
    text.innerText = data["text_list"][i];
    
    // 移除toggle元素，因为我们将默认展开
    const toggleElement = copiedNode.querySelector(".ditto-toggle");
    if (toggleElement) {
      toggleElement.remove();
    }
    const sampleBox = copiedNode.querySelector(".ditto-sample-box");
    if (sampleBox) {
      sampleBox.classList.add("show"); // 默认展开
      
      // 添加prompt audio
      const promptAudioSection = document.createElement('div');
      promptAudioSection.className = 'prompt-audio-player-section'; // For potential styling
      promptAudioSection.style.paddingBottom = '15px'; // Add some space below it

      const promptHeaderElement = document.createElement('th'); // Using th for the header
      promptHeaderElement.textContent = 'Prompt Audio:';
      promptAudioSection.appendChild(promptHeaderElement);

      const promptAudioPlayer = document.createElement('audio');
      promptAudioPlayer.controls = true;
      promptAudioPlayer.preload = 'none';
      promptAudioPlayer.style.width = '25%'; // Make it responsive

      let promptAudioSrc = '';
      promptAudioSrc = data.prompt_path + "/" + data["wav_list"][i]; 

      promptAudioPlayer.src = promptAudioSrc;
      promptAudioSection.appendChild(promptAudioPlayer);

      // Insert the new prompt audio section inside .ditto-sample-box,
      // but *before* the div that contains the tables.
      const tableContainerDiv = sampleBox.querySelector('.table-responsive.pt-3'); //
      sampleBox.insertBefore(promptAudioSection, tableContainerDiv);
    }

    
    // --- 动态构建第一个表格 ---
    const table1 = copiedNode.querySelector(".dynamically-generated-table-1");
    const thead1 = table1.querySelector('thead');
    const tbody1 = table1.querySelector('tbody');

    // 清空可能存在的预设内容 (如果模板中的 a_thead 和 a_tbody 不是完全空的)
    if (thead1) thead1.innerHTML = '';
    if (tbody1) tbody1.innerHTML = '';

    // 动态定义表头1
    const headers1 = ["SFM (α=2.0)", "Ground truth", "Vocoder reconstructed", "Baseline", "Ablated", "SFM-t (α=2.5)"]; // 示例表头
    const headerRow1 = thead1.insertRow();
    headers1.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      // 可以根据需要给表头添加特定类名或样式
      if (headerText === "SFM (α=2.0)") th.className = "border-right"; // 模拟原样式
      headerRow1.appendChild(th);
    });
    
    // 动态定义数据行1 (基于 data["path_sort_list"] 的前几个)
    const dataRow1 = tbody1.insertRow();
    const numCols1 = headers1.length; // 表格1的列数
    for (let j = 0; j < numCols1; j++) {
      if (j < data["path_sort_list"].length) { // 确保有数据
        const cell = dataRow1.insertCell();
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = "none";
        audio.src = data["path_sort_list"][j] + "/" + data["wav_list"][i];
        cell.appendChild(audio);
        // 可以根据需要给单元格添加特定类名或data-label
        if (j === 0) cell.className = "border-right";
        cell.setAttribute('data-label', headers1[j]); // 对应表头
      }
    }

    // --- 动态构建第二个表格 (类似地) ---
    const table2 = copiedNode.querySelector(".dynamically-generated-table-2");
    const thead2 = table2.querySelector('thead');
    const tbody2 = table2.querySelector('tbody');

    if (thead2) thead2.innerHTML = '';
    if (tbody2) tbody2.innerHTML = '';

    const headers2 = ["SFM (α=1.0)", "SFM (α=3.0)", "SFM (α=4.0)", "SFM (α=5.0)"];
    const headerRow2 = thead2.insertRow();
    headers2.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow2.appendChild(th);
    });

    const dataRow2 = tbody2.insertRow();
    const startIndexTable2 = numCols1; // 从 path_sort_list 中 table1 用完之后的数据开始
    for (let k = 0; k < headers2.length; k++) {
      const dataIndex = startIndexTable2 + k; // 对应 path_sort_list 中的索引
      if (dataIndex < data["path_sort_list"].length) {
        const cell = dataRow2.insertCell();
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = "none";
        audio.src = data["path_sort_list"][dataIndex] + "/" + data["wav_list"][i];
        cell.appendChild(audio);
        cell.setAttribute('data-label', headers2[k]);
      } else if (dataIndex < data["path_sort_list"].length) {
        const cell = dataRow2.insertCell();
        // cell.textContent = "N/A";
        cell.setAttribute('data-label', headers2[k]);
      }
    }

    fragment.appendChild(copiedNode);
  }

  const root = document.querySelector(id);
  root.appendChild(fragment); // 将所有生成的卡片一次性添加到DOM
}

function divBuilderStableLibriTTS(id, data) {
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < data["text_list"].length; i++) { // 对于每个要展示的条目
    const copiedNode = document.importNode(
      document.querySelector("#prompt-template").content,
      true
    );

    const promptText = copiedNode.querySelector(".ditto-prompt-text > span");
    promptText.innerText = data["prompt_text_list"][i];
    const text = copiedNode.querySelector(".ditto-text > span");
    text.innerText = data["text_list"][i];
    
    // 移除toggle元素，因为我们将默认展开
    const toggleElement = copiedNode.querySelector(".ditto-toggle");
    if (toggleElement) {
      toggleElement.remove();
    }
    const sampleBox = copiedNode.querySelector(".ditto-sample-box");
    if (sampleBox) {
      sampleBox.classList.add("show"); // 默认展开
      
      // 添加prompt audio
      const promptAudioSection = document.createElement('div');
      promptAudioSection.className = 'prompt-audio-player-section'; // For potential styling
      promptAudioSection.style.paddingBottom = '15px'; // Add some space below it

      const promptHeaderElement = document.createElement('th'); // Using th for the header
      promptHeaderElement.textContent = 'Prompt Audio:';
      promptAudioSection.appendChild(promptHeaderElement);

      const promptAudioPlayer = document.createElement('audio');
      promptAudioPlayer.controls = true;
      promptAudioPlayer.preload = 'none';
      promptAudioPlayer.style.width = '25%'; // Make it responsive

      let promptAudioSrc = '';
      promptAudioSrc = data.prompt_path + "/" + data["wav_list"][i]; 

      promptAudioPlayer.src = promptAudioSrc;
      promptAudioSection.appendChild(promptAudioPlayer);

      // Insert the new prompt audio section inside .ditto-sample-box,
      // but *before* the div that contains the tables.
      const tableContainerDiv = sampleBox.querySelector('.table-responsive.pt-3'); //
      sampleBox.insertBefore(promptAudioSection, tableContainerDiv);
    }

    
    // --- 动态构建第一个表格 ---
    const table1 = copiedNode.querySelector(".dynamically-generated-table-1");
    const thead1 = table1.querySelector('thead');
    const tbody1 = table1.querySelector('tbody');

    // 清空可能存在的预设内容 (如果模板中的 a_thead 和 a_tbody 不是完全空的)
    if (thead1) thead1.innerHTML = '';
    if (tbody1) tbody1.innerHTML = '';

    // 动态定义表头1
    const headers1 = ["SFM (α=2.5)", "Ground truth", "Vocoder reconstructed", "Ablated", "SFM-c (α=4.0)"]; // 示例表头
    const headerRow1 = thead1.insertRow();
    headers1.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      // 可以根据需要给表头添加特定类名或样式
      if (headerText === "SFM (α=2.5)") th.className = "border-right"; // 模拟原样式
      headerRow1.appendChild(th);
    });
    
    // 动态定义数据行1 (基于 data["path_sort_list"] 的前几个)
    const dataRow1 = tbody1.insertRow();
    const numCols1 = headers1.length; // 表格1的列数
    for (let j = 0; j < numCols1; j++) {
      if (j < data["path_sort_list"].length) { // 确保有数据
        const cell = dataRow1.insertCell();
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = "none";
        audio.src = data["path_sort_list"][j] + "/" + data["wav_list"][i];
        cell.appendChild(audio);
        // 可以根据需要给单元格添加特定类名或data-label
        if (j === 0) cell.className = "border-right";
        cell.setAttribute('data-label', headers1[j]); // 对应表头
      }
    }

    // --- 动态构建第二个表格 (类似地) ---
    const table2 = copiedNode.querySelector(".dynamically-generated-table-2");
    const thead2 = table2.querySelector('thead');
    const tbody2 = table2.querySelector('tbody');

    if (thead2) thead2.innerHTML = '';
    if (tbody2) tbody2.innerHTML = '';

    const headers2 = ["SFM (α=1.0)", "SFM (α=2.0)", "SFM (α=3.0)", "SFM (α=4.0)", "SFM (α=5.0)"];
    const headerRow2 = thead2.insertRow();
    headers2.forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow2.appendChild(th);
    });

    const dataRow2 = tbody2.insertRow();
    const startIndexTable2 = numCols1; // 从 path_sort_list 中 table1 用完之后的数据开始
    for (let k = 0; k < headers2.length; k++) {
      const dataIndex = startIndexTable2 + k; // 对应 path_sort_list 中的索引
      if (dataIndex < data["path_sort_list"].length) {
        const cell = dataRow2.insertCell();
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.preload = "none";
        audio.src = data["path_sort_list"][dataIndex] + "/" + data["wav_list"][i];
        cell.appendChild(audio);
        cell.setAttribute('data-label', headers2[k]);
      } else if (dataIndex < data["path_sort_list"].length) {
        const cell = dataRow2.insertCell();
        // cell.textContent = "N/A";
        cell.setAttribute('data-label', headers2[k]);
      }
    }

    fragment.appendChild(copiedNode);
  }

  const root = document.querySelector(id);
  root.appendChild(fragment); // 将所有生成的卡片一次性添加到DOM
}


const MatchaLJSpeechData = {
  text_list: [
    "Mrs. Earlene Roberts, the housekeeper at Oswald's roominghouse and the last person known to have seen him before he reached tenth Street and Patton Avenue,",
    "The Secret Service should not and does not plan to develop its own intelligence gathering facilities to duplicate the existing facilities of other Federal agencies.",
    "he left his wedding ring in a cup on the dresser in his room. He also left one hundred seventy dollars in a wallet in one of the dresser drawers.",
    "On several occasions when the Vice President's car was slowed down by the throng, Special Agent Youngblood stepped out to hold the crowd back.",
    'It was diverted from its proper uses, and, as the "place of the greatest comfort," was allotted to persons who should not have been sent to Newgate at all.',
    "was strewn in front of the dock, and sprinkled it towards the bench with a contemptuous gesture.",
    "all one had to do was get a high building someday with a telescopic rifle, and there was nothing anybody could do to defend against such an attempt.",
    "it sounded high and I immediately kind of looked up,"
      ],

  path_sort_list: [
    "audios/matcha-ljspeech/ljspeech-sfm-2.5",
    "audios/matcha-ljspeech/ljspeech-gt",
    "audios/matcha-ljspeech/ljspeech-reconstructed",
    "audios/matcha-ljspeech/ljspeech-origin",
    "audios/matcha-ljspeech/ljspeech-refine",
    "audios/matcha-ljspeech/ljspeech-sfm-1.0",
    "audios/matcha-ljspeech/ljspeech-sfm-2.0",
    "audios/matcha-ljspeech/ljspeech-sfm-3.0",
    "audios/matcha-ljspeech/ljspeech-sfm-4.0",
    "audios/matcha-ljspeech/ljspeech-sfm-5.0",
  ],

  wav_list: [
    "LJ037-0249.wav",
    "LJ050-0161.wav",
    "LJ045-0178.wav",
    "LJ030-0125.wav",
    "LJ007-0125.wav",
    "LJ014-0142.wav",
    "LJ030-0021.wav",
    "LJ035-0014.wav",
  ],

  prompt_time: Array(8).fill(3),
};

const MatchaVCTKData = {
  text_list: [
    "Gas production was also at record levels last year.",
    "When the sunlight strikes raindrops in the air, they act as a prism and form a rainbow.",
    "The rainbow is a division of white light into many beautiful colors.",
    "If the red of the second bow falls upon the green of the first, the result is to give a bow with an abnormally wide yellow band, since red and green light when mixed form yellow.",
    "This is a very common type of bow, one showing mainly red and yellow, with little or no green or blue.",
    "Maybe full-time referees will provide the answer.)",
    "The Scottish Parliament is also looking at similar measures.",
    "However, the following year the cancer returned.",
  ],

  path_sort_list: [
    "audios/matcha-vctk/vctk-sfm-3.5",
    "audios/matcha-vctk/vctk-gt",
    "audios/matcha-vctk/vctk-reconstructed",
    "audios/matcha-vctk/vctk-origin",
    "audios/matcha-vctk/vctk-refine",
    "audios/matcha-vctk/vctk-sfm-1.0",
    "audios/matcha-vctk/vctk-sfm-2.0",
    "audios/matcha-vctk/vctk-sfm-3.0",
    "audios/matcha-vctk/vctk-sfm-4.0",
    "audios/matcha-vctk/vctk-sfm-5.0",
  ],

  wav_list: [
    "p280_208.wav",
    "p266_006.wav",
    "p260_007.wav",
    "p334_023.wav",
    "p311_024.wav",
    "p259_052.wav",
    "p228_048.wav",
    "p241_029.wav",
  ],

  prompt_time: Array(8).fill(3),
};

const StableVCTKData = {
  text_list: [
    "Military action is the only option we have on the table today.",
    "Maybe this battle has been.",
    "To the Hebrews it was a token that there would be no more universal floods.",
    "There is nothing like this back home.",
    "If they liked it then I'll be happy.",
    "The rainbow is a division of white light into many beautiful colors.",
    "Rangers deserved to beat us.",
    "I should think so, too.",
  ],

  path_sort_list: [
    "audios/stable-vctk/stable-vctk-sfm-3.0",
    "audios/stable-vctk/stable-vctk-gt",
    "audios/stable-vctk/stable-vctk-reconstructed",
    "audios/stable-vctk/stable-vctk-refine",
    "audios/stable-vctk/stable-vctk-sfm-mu-4.5",
    "audios/stable-vctk/stable-vctk-sfm-1.0",
    "audios/stable-vctk/stable-vctk-sfm-2.0",
    "audios/stable-vctk/stable-vctk-sfm-4.0",
    "audios/stable-vctk/stable-vctk-sfm-5.0",
  ],

  wav_list: [
    "p265_153.wav",
    "p226_121.wav",
    "p277_014.wav",
    "p300_224.wav",
    "p276_118.wav",
    "p297_007.wav",
    "p314_053.wav",
    "p231_408.wav",
  ],

  prompt_time: Array(8).fill(3),
};

const CosyVoiceLibriTTSData = {
  prompt_text_list:[
    "The Abraham Lincoln had been perfectly chosen and fitted out for its new assignment.",
    "Ben Zoof was devoted, body and soul, to his superior officer.",
    '"How do you do, my children?" she said, on one such occasion.',
    '"But it was a generous act, too," said Beth.',
    '"Where thee and thy family are known?"',
    '"But," cried Duncan, "I see no signs of-"',
    "Pass me the thong of buckskin, Uncas, and let me take the length of this foot.",
    '"Huh!" exclaimed the Boolooroo; "that\'s queer.',
  ],

  prompt_path: "audios/cosyvoice-libritts/cosyvoice-prompt",

  text_list: [
    "Nor was he all muscle by a great deal; he was well balanced as to mother wit and shrewdness.",
    "Would not the loftiest eminences of the city at least be visible?",
    "On huge silver platters were pyramids of tarts and cakes, and red wine sparkled in glittering decanters.",
    "Kenneth and Beth went away quite happy with their success, and the manager stood in his little window and watched them depart.",
    "The two were intimate at that time,--they had been classmates-and saw a great deal of each other.",
    "It was easy to follow the tracks of the Narragansetts, but they seemed only to have wandered without guides, or any other object than the pursuit of food.",
    "A circle of a few hundred feet in circumference was drawn, and each of the party took a segment for his portion.",
    "My guards are not to be trusted, and I don't mean to let you out of my sight again until you are patched.\"",
  ],

  path_sort_list: [
    "audios/cosyvoice-libritts/cosyvoice-sfm-2.0",
    "audios/cosyvoice-libritts/cosyvoice-gt",
    "audios/cosyvoice-libritts/cosyvoice-reconstructed",
    "audios/cosyvoice-libritts/cosyvoice-origin",
    "audios/cosyvoice-libritts/cosyvoice-refine",
    "audios/cosyvoice-libritts/cosyvoice-sfm-single-2.5",
    "audios/cosyvoice-libritts/cosyvoice-sfm-1.0",
    "audios/cosyvoice-libritts/cosyvoice-sfm-3.0",
    "audios/cosyvoice-libritts/cosyvoice-sfm-4.0",
    "audios/cosyvoice-libritts/cosyvoice-sfm-5.0",
  ],

  wav_list: [
    "8463_287645_000003_000002.wav",
    "5105_28241_000021_000001.wav",
    "7021_85628_000022_000001.wav",
    "6829_68769_000097_000000.wav",
    "4970_29093_000029_000000.wav",
    "1320_122612_000017_000000.wav",
    "1320_122612_000020_000001.wav",
    "8555_284447_000010_000001.wav",
  ],

  prompt_time: Array(8).fill(3),
};

const StableLibriTTSData = {
  prompt_text_list:[
    "The surgeon desired them not to talk to him, but leave him to repose.",
    "When she became aware of Anders and the soldiers, she walked over to them.",
    "There were no footmarks and no other evidence as to his identity.",
    "And what sort of evidence is logically possible?",
    "The king seemed only pleased with every one present.",
    "But the people called upon him for a speech, so he faced the Blueskins and said:",
    "\"What's become of Tiggle?\" he shouted.",
    "\"My dear Sir,\" I should reply (or Madam), \"you have come to the right shop.",
  ],

  prompt_path: "audios/stable-libritts/stable-prompt",

  text_list: [
    "But Rodolfo had been struck by the great beauty of Leocadia, the hidalgo's daughter, and presently he began to entertain the idea of enjoying it at all hazards.",
    "His brothers and sisters walked about squinting at him, and their faces grew long with envy.",
    "\"The moment I looked at my table, I was aware that someone had rummaged among my papers.",
    "Like all sceptical hypotheses, it is logically tenable, but uninteresting.",
    "Look yonder, do you not see the moon slowly rising, silvering the topmost branches of the chestnuts and the oaks.",
    "However, as the two forces came nearer together, Button Bright spied Trot and Cap'n Bill standing before the enemy, and the sight astonished him considerably.",
    "And then With foam the skies are splashed and sprayed; And that's how all the stars are made.",
    "Just as he made his cast, he saw the fleeing drake and the pursuing hawk come round the bend.",
  ],

  path_sort_list: [
    "audios/stable-libritts/stable-sfm-2.5",
    "audios/stable-libritts/stable-gt",
    "audios/stable-libritts/stable-reconstructed",
    "audios/stable-libritts/stable-refine",
    "audios/stable-libritts/stable-sfm-mu-4.0",
    "audios/stable-libritts/stable-sfm-1.0",
    "audios/stable-libritts/stable-sfm-2.0",
    "audios/stable-libritts/stable-sfm-3.0",
    "audios/stable-libritts/stable-sfm-4.0",
    "audios/stable-libritts/stable-sfm-5.0",
  ],

  wav_list: [
    "5639_40744_000000_000004.wav",
    "7021_85628_000004_000000.wav",
    "1580_141083_000010_000000.wav",
    "8230_279154_000007_000001.wav",
    "7127_75947_000055_000003.wav",
    "8555_284449_000009_000000.wav",
    "8555_292519_000045_000001.wav",
    "7176_88083_000022_000000.wav",
  ],

  prompt_time: Array(8).fill(3),
};



document
  .querySelector(
    'button[data-bs-toggle="tab"][data-bs-target="#matcha-ljspeech-box"]',
  )
  .addEventListener("shown.bs.tab", function (event) {
    divBuilderMatchaLJSpeech("#matcha-ljspeech-box", MatchaLJSpeechData);
  });
document
  .querySelector('button[data-bs-toggle="tab"][data-bs-target="#matcha-vctk-box"]')
  .addEventListener("shown.bs.tab", function (event) {
      divBuilderMatchaVCTK("#matcha-vctk-box", MatchaVCTKData);
  });
document
  .querySelector('button[data-bs-toggle="tab"][data-bs-target="#stable-vctk-box"]')
  .addEventListener("shown.bs.tab", function (event) {
      divBuilderStableVCTK("#stable-vctk-box", StableVCTKData);
  });
document
  .querySelector('button[data-bs-toggle="tab"][data-bs-target="#cosyvoice-libritts-box"]')
  .addEventListener("shown.bs.tab", function (event) {
      divBuilderCosyVoiceLibriTTS("#cosyvoice-libritts-box", CosyVoiceLibriTTSData);
  });
document
  .querySelector('button[data-bs-toggle="tab"][data-bs-target="#stable-libritts-box"]')
  .addEventListener("shown.bs.tab", function (event) {
      divBuilderStableLibriTTS("#stable-libritts-box", StableLibriTTSData);
  });


addEventListener("scroll", (event) => {
  if (document.querySelector("#myTab").offsetTop < window.scrollY) {
    document.querySelector("#fab").classList.add("show");
  } else {
    document.querySelector("#fab").classList.remove("show");
  }
});

// 由于底下的框是要点击一下才展开，这里添加一个点击操作
divBuilderMatchaLJSpeech("#matcha-ljspeech-box", MatchaLJSpeechData);