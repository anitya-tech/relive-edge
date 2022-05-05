params = ["instanceId"]

// Rec
exchange "RecEvent" {
  name = "rec-events"

  type    = "topic"
  options = { durable = true }
}

exchange "UploadEvent" {
  name = "edge-upload"

  type    = "topic"
  options = { durable = true }
}

queue "ThisUpload" {
  name = "edge-upload-tasks.${instanceId}"

  options = { durable = true }

  bind {
    exchange = RecEvent
    topics   = ["${instanceId}.FileClosed"]
  }
}

// Transcode
queue "Transcode" {
  name = "edge-transcode-tasks"

  options = { durable = true }

  bind {
    exchange = UploadEvent
    topics   = ["VIDEO_WITH_DANMAKU"]
  }
}
