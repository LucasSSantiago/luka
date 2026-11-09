import env from '#start/env'
import { AzureCliCredential } from '@azure/identity'
import {
  BlobServiceClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  SASProtocol,
} from '@azure/storage-blob'
import type { ContainerClient } from '@azure/storage-blob'

export default class AzureBlobService {
  private readonly blobServiceClient: BlobServiceClient
  private readonly containerClient: ContainerClient

  constructor() {
    const credential = new AzureCliCredential()

    this.blobServiceClient = new BlobServiceClient(env.get('AZURE_STORAGE_ACCOUNT_URL'), credential)

    this.containerClient = this.blobServiceClient.getContainerClient(
      env.get('AZURE_STORAGE_CONTAINER')
    )
  }

  async getContainerProperties() {
    const properties = this.containerClient.getProperties()

    return properties
  }

  async generateUploadUrl(blobName: string) {
    const now = Date.now()
    const startsOn = new Date(now - 5 * 60 * 1000)
    const expiresOn = new Date(now + 15 * 60 * 1000)

    const delegationKey = await this.blobServiceClient.getUserDelegationKey(startsOn, expiresOn)

    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.containerClient.containerName,
        blobName,
        permissions: BlobSASPermissions.parse('c'),
        protocol: SASProtocol.Https,
        startsOn,
        expiresOn,
      },
      delegationKey,
      this.blobServiceClient.accountName
    ).toString()

    const blobClient = this.containerClient.getBlockBlobClient(blobName)

    return {
      uploadUrl: `${blobClient.url}?${sas}`,
      expiresAt: expiresOn.toISOString(),
    }
  }

  async getBlobProperties(blobName: string) {
    const blobClient = this.containerClient.getBlobClient(blobName)

    const properties = await blobClient.getProperties()

    return {
      sizeBytes: properties.contentLength,
      contentType: properties.contentType,
    }
  }
}
