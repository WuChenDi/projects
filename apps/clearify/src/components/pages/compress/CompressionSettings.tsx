import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab996/ui/components/card'
import { Field, FieldGroup } from '@cdlab996/ui/components/field'
import { Input } from '@cdlab996/ui/components/input'
import { Label } from '@cdlab996/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cdlab996/ui/components/select'
import type { ConversionSettings } from '@/types'

interface CompressionSettingsProps {
  settings: ConversionSettings
  onSettingChange: (key: keyof ConversionSettings, value: string) => void
}

export function CompressionSettings({
  settings,
  onSettingChange,
}: CompressionSettingsProps) {
  const renderCompressionControl = () => {
    switch (settings.compressionMethod) {
      case 'percentage':
        return (
          <Field>
            <Label>Target Quality Percentage</Label>
            <Input
              type="range"
              min="1"
              max="100"
              value={settings.targetPercentage || '100'}
              onChange={(e) =>
                onSettingChange('targetPercentage', e.target.value)
              }
              className="w-full"
            />
            <div className="text-sm text-muted-foreground text-center">
              {settings.targetPercentage || '100'}% quality
            </div>
          </Field>
        )
      case 'filesize':
        return (
          <Field>
            <Label>Target File Size (MB)</Label>
            <Input
              type="number"
              min="1"
              max="10240"
              value={settings.targetFilesize || '100'}
              onChange={(e) =>
                onSettingChange('targetFilesize', e.target.value)
              }
              className="w-full"
            />
          </Field>
        )
      case 'crf':
        return (
          <Field>
            <Label>Video Quality (CRF)</Label>
            <Select
              value={settings.crfValue || '23'}
              onValueChange={(value) => onSettingChange('crfValue', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 34 }, (_, i) => i + 18).map((value) => (
                  <SelectItem key={value} value={value.toString()}>
                    {value}{' '}
                    {value === 18
                      ? '(Best Quality)'
                      : value === 51
                        ? '(Smallest Size)'
                        : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )
      case 'bitrate':
        return (
          <Field>
            <Label>Video Bitrate</Label>
            <Select
              value={settings.videoBitrate}
              onValueChange={(value) => onSettingChange('videoBitrate', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select bitrate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="300k">300 Kbps</SelectItem>
                <SelectItem value="1000k">1 Mbps</SelectItem>
                <SelectItem value="2500k">2.5 Mbps</SelectItem>
                <SelectItem value="5000k">5 Mbps</SelectItem>
                <SelectItem value="8000k">8 Mbps</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Compression Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Field>
          <Field>
            <Label>Compression Method</Label>
            <Select
              value={settings.compressionMethod}
              onValueChange={(value) =>
                onSettingChange('compressionMethod', value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">
                  Target quality percentage
                </SelectItem>
                <SelectItem value="filesize">Target file size (MB)</SelectItem>
                <SelectItem value="crf">Target video quality (CRF)</SelectItem>
                <SelectItem value="bitrate">Target bitrate</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {renderCompressionControl()}

          <FieldGroup className="grid grid-cols-2 gap-3">
            <Field>
              <Label>Video Codec</Label>
              <Select
                value={settings.videoCodec}
                onValueChange={(value) =>
                  onSettingChange('videoCodec', value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="libx264">H.264</SelectItem>
                  <SelectItem value="libx265">H.265</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <Label>Audio Codec</Label>
              <Select
                value={settings.audioCodec}
                onValueChange={(value) =>
                  onSettingChange('audioCodec', value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aac">AAC</SelectItem>
                  <SelectItem value="mp3">MP3</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <Label>Audio Bitrate</Label>
              <Select
                value={settings.audioBitrate}
                onValueChange={(value) =>
                  onSettingChange('audioBitrate', value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="64k">64 kbps</SelectItem>
                  <SelectItem value="96k">96 kbps</SelectItem>
                  <SelectItem value="128k">128 kbps</SelectItem>
                  <SelectItem value="192k">192 kbps</SelectItem>
                  <SelectItem value="256k">256 kbps</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <Label>Frame Rate</Label>
              <Select
                value={settings.frameRate}
                onValueChange={(value) => onSettingChange('frameRate', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 fps</SelectItem>
                  <SelectItem value="30">30 fps</SelectItem>
                  <SelectItem value="60">60 fps</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <Field>
            <Label>Max Resolution</Label>
            <Select
              value={settings.resolution}
              onValueChange={(value) => onSettingChange('resolution', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1920x1080">1080p (1920px)</SelectItem>
                <SelectItem value="1280x720">720p (1280px)</SelectItem>
                <SelectItem value="854x480">480p (854px)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Field>
      </CardContent>
    </Card>
  )
}
