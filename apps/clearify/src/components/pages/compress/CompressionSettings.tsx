import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@cdlab/ui/components/card'
import { Field, FieldGroup } from '@cdlab/ui/components/field'
import { Input } from '@cdlab/ui/components/input'
import { Label } from '@cdlab/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cdlab/ui/components/select'
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
      case 'quality':
        return (
          <Field>
            <Label>Quality</Label>
            <Select
              value={settings.quality}
              onValueChange={(value) => onSettingChange('quality', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (Smallest Size)</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="very_high">
                  Very High (Best Quality)
                </SelectItem>
              </SelectContent>
            </Select>
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
                <SelectItem value="quality">Quality preset</SelectItem>
                <SelectItem value="filesize">Target file size (MB)</SelectItem>
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
                onValueChange={(value) => onSettingChange('videoCodec', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="avc">H.264</SelectItem>
                  <SelectItem value="hevc">H.265</SelectItem>
                </SelectContent>
              </Select>
              {settings.videoCodec === 'hevc' && (
                <p className="text-xs text-amber-500">
                  H.265 needs hardware encoder support; falls back to H.264 if
                  unavailable.
                </p>
              )}
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
                  <SelectItem value="original">Original</SelectItem>
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
                <SelectItem value="original">Original</SelectItem>
                <SelectItem value="1080">1080p</SelectItem>
                <SelectItem value="720">720p</SelectItem>
                <SelectItem value="480">480p</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Field>
      </CardContent>
    </Card>
  )
}
