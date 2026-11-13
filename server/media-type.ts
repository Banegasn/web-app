/** Match the supported binary signatures; never trust an archive's extension. */
export function imageType(data: Buffer): string {
    const hex = data.subarray(0, 12).toString('hex');
    return hex.startsWith('89504e470d0a1a0a')
        ? 'image/png'
        : hex.startsWith('ffd8ff')
          ? 'image/jpeg'
          : /^474946383[79]61/.test(hex)
            ? 'image/gif'
            : data.toString('ascii', 0, 4) === 'RIFF' &&
                data.toString('ascii', 8, 12) === 'WEBP'
              ? 'image/webp'
              : '';
}
