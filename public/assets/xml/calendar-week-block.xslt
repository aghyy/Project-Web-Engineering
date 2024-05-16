<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="yes" encoding="UTF-8"/>
  
  <xsl:template match="/">
    <xsl:apply-templates select="//lesson"/>
  </xsl:template>
  
  <xsl:template match="lesson">
    <div class="lesson">
      <h2><xsl:value-of select="lesson"/></h2>
      <p><strong>Instructor:</strong> <xsl:value-of select="person"/></p>
      <p><strong>Room:</strong> <xsl:value-of select="room"/></p>
      <p><strong>Total Time:</strong> <xsl:value-of select="total_time"/></p>
      <p><strong>Start Time:</strong> <xsl:value-of select="begin"/></p>
    </div>
  </xsl:template>
</xsl:stylesheet>